// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IQUNMemberRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isActive(uint256 tokenId) external view returns (bool);
}

/// @title QUNPayroll
/// @notice Pays a pre-funded ERC-20 reserve to the current owner of an active QUN membership NFT.
/// @dev A transaction must trigger payment. A keeper/automation service can call payMany on a schedule.
///      The MVP period is a fixed 30 days, not a UTC calendar month.
contract QUNPayroll is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint64 public constant PAYMENT_PERIOD = 30 days;
    uint256 public constant MAX_BATCH_SIZE = 50;

    struct Schedule {
        uint128 amountPerPeriod;
        uint64 nextPaymentAt;
        uint64 paidPeriods;
        bool active;
    }

    error ZeroAddress();
    error InvalidAmount();
    error InvalidMember();
    error InvalidSchedule();
    error PaymentNotDue();
    error BatchTooLarge();
    error TimestampOverflow();

    event PayrollFunded(address indexed funder, uint256 amount);
    event ScheduleUpdated(
        uint256 indexed tokenId,
        uint256 amountPerPeriod,
        uint256 nextPaymentAt
    );
    event ScheduleCancelled(uint256 indexed tokenId);
    event SalaryPaid(
        uint256 indexed tokenId,
        address indexed beneficiary,
        uint256 amountPerPeriod,
        uint256 periodsPaid,
        uint256 totalAmount,
        uint256 nextPaymentAt
    );
    event BatchProcessed(uint256 processed, address indexed executor);

    IERC20 public immutable token;
    IQUNMemberRegistry public immutable membership;
    mapping(uint256 tokenId => Schedule schedule) public schedules;

    constructor(address tokenAddress, address membershipAddress, address initialOwner)
        Ownable(initialOwner)
    {
        if (
            tokenAddress == address(0) ||
            membershipAddress == address(0) ||
            initialOwner == address(0)
        ) revert ZeroAddress();

        token = IERC20(tokenAddress);
        membership = IQUNMemberRegistry(membershipAddress);
    }

    /// @notice Move approved QUN tokens into the payroll reserve.
    function fund(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit PayrollFunded(msg.sender, amount);
    }

    /// @notice Create or replace a schedule for one membership NFT.
    /// @param firstPaymentAt Unix timestamp when the first payment becomes due.
    function setSchedule(
        uint256 tokenId,
        uint128 amountPerPeriod,
        uint64 firstPaymentAt
    ) external onlyOwner {
        if (!membership.isActive(tokenId)) revert InvalidMember();
        if (amountPerPeriod == 0 || firstPaymentAt == 0) revert InvalidSchedule();

        schedules[tokenId] = Schedule({
            amountPerPeriod: amountPerPeriod,
            nextPaymentAt: firstPaymentAt,
            paidPeriods: 0,
            active: true
        });

        emit ScheduleUpdated(tokenId, amountPerPeriod, firstPaymentAt);
    }

    function cancelSchedule(uint256 tokenId) external onlyOwner {
        if (!schedules[tokenId].active) revert InvalidSchedule();
        schedules[tokenId].active = false;
        emit ScheduleCancelled(tokenId);
    }

    /// @notice Pay one due schedule. Anyone may execute it; the recipient is fixed by the NFT.
    function pay(uint256 tokenId) external nonReentrant {
        Schedule storage schedule = schedules[tokenId];
        _pay(tokenId, schedule);
    }

    /// @notice Process due schedules in a bounded batch for keeper services.
    ///         Inactive/revoked NFTs and not-yet-due schedules are skipped.
    function payMany(uint256[] calldata tokenIds)
        external
        nonReentrant
        returns (uint256 processed)
    {
        if (tokenIds.length == 0 || tokenIds.length > MAX_BATCH_SIZE) {
            revert BatchTooLarge();
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            Schedule storage schedule = schedules[tokenId];

            if (
                schedule.active &&
                block.timestamp >= schedule.nextPaymentAt &&
                membership.isActive(tokenId)
            ) {
                _pay(tokenId, schedule);
                processed++;
            }
        }

        emit BatchProcessed(processed, msg.sender);
    }

    function availableBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function _pay(uint256 tokenId, Schedule storage schedule) internal {
        if (!schedule.active) revert InvalidSchedule();
        if (!membership.isActive(tokenId)) revert InvalidMember();
        if (block.timestamp < schedule.nextPaymentAt) revert PaymentNotDue();

        address beneficiary = membership.ownerOf(tokenId);

        // Catch up every elapsed 30-day period in one payment.
        uint256 periodsDue =
            ((block.timestamp - uint256(schedule.nextPaymentAt)) / PAYMENT_PERIOD) + 1;
        uint256 totalAmount = uint256(schedule.amountPerPeriod) * periodsDue;
        uint256 nextPayment = uint256(schedule.nextPaymentAt) + (periodsDue * PAYMENT_PERIOD);

        if (
            nextPayment > type(uint64).max ||
            periodsDue > (type(uint64).max - schedule.paidPeriods)
        ) revert TimestampOverflow();

        // State is updated before the external token call; a failed transfer reverts everything.
        schedule.nextPaymentAt = uint64(nextPayment);
        schedule.paidPeriods += uint64(periodsDue);

        token.safeTransfer(beneficiary, totalAmount);

        emit SalaryPaid(
            tokenId,
            beneficiary,
            schedule.amountPerPeriod,
            periodsDue,
            totalAmount,
            nextPayment
        );
    }
}
