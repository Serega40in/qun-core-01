// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice QUN 0.1 test token. NOT audited and NOT for real funds.
/// @dev Owner can mint until the hard cap; future production governance is out of scope.
contract QUNToken is ERC20, ERC20Capped, Ownable {
    uint256 public constant INITIAL_SUPPLY = 100_000_000 ether;
    uint256 public constant MAX_SUPPLY = 1_000_000_000 ether;

    constructor(address initialOwner)
        ERC20("QUN", "QUN")
        ERC20Capped(MAX_SUPPLY)
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "QUN: owner is zero");
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /// @notice Mint additional test tokens, limited by MAX_SUPPLY.
    /// @dev Production issuance rules must be approved and audited before mainnet use.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
