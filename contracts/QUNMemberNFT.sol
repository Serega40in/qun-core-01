// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title QUNMemberNFT
/// @notice Non-transferable membership credentials for QUN projects.
/// @dev This is an identity/role credential, not a financial security or proof of employment.
contract QUNMemberNFT is ERC721, Ownable {
    struct MemberProfile {
        bytes32 projectId;
        bytes32 roleId;
        bool active;
    }

    error ZeroAddress();
    error InvalidMember();
    error Soulbound();

    event MemberMinted(
        address indexed account,
        uint256 indexed tokenId,
        bytes32 indexed projectId,
        bytes32 roleId
    );
    event MemberRevoked(address indexed previousOwner, uint256 indexed tokenId);
    event BaseURIChanged(string newBaseURI);

    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    mapping(uint256 tokenId => MemberProfile profile) public profiles;

    constructor(address initialOwner, string memory baseTokenURI)
        ERC721("QUN Membership", "QUN-MEMBER")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) revert ZeroAddress();
        _baseTokenURI = baseTokenURI;
    }

    /// @notice Issue a membership NFT to a QUN participant.
    /// @param account Wallet that will hold the credential.
    /// @param projectId Short project identifier encoded as bytes32.
    /// @param roleId Short role identifier encoded as bytes32.
    function mintMember(
        address account,
        bytes32 projectId,
        bytes32 roleId
    ) external onlyOwner returns (uint256 tokenId) {
        if (account == address(0)) revert ZeroAddress();

        tokenId = _nextTokenId++;
        profiles[tokenId] = MemberProfile({
            projectId: projectId,
            roleId: roleId,
            active: true
        });

        _safeMint(account, tokenId);
        emit MemberMinted(account, tokenId, projectId, roleId);
    }

    /// @notice Revoke a credential. Revoked NFTs are burned and cannot receive payroll.
    function revokeMember(uint256 tokenId) external onlyOwner {
        address previousOwner = _ownerOf(tokenId);
        if (previousOwner == address(0) || !profiles[tokenId].active) {
            revert InvalidMember();
        }

        profiles[tokenId].active = false;
        _burn(tokenId);
        emit MemberRevoked(previousOwner, tokenId);
    }

    function isActive(uint256 tokenId) external view returns (bool) {
        return profiles[tokenId].active && _ownerOf(tokenId) != address(0);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIChanged(newBaseURI);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /// @dev Mint and burn are allowed; transfers between wallets are intentionally blocked.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
