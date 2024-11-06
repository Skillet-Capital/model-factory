// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IKettleAssetFactory {
    function operators(address) external view returns (bool);
    function lockedContracts(address) external view returns (bool);
    function lockedTokens(address, uint256) external view returns (bool);
    function approvedTransfers(address, address, address, uint256) external view returns (bool);
    function tokenURI(address asset, uint256 tokenId) external view returns (string memory);
    function indexTransfer(address asset, address from, address to, uint256 tokenId) external;
    function removeApprovedTransfer(address asset, address from, address to, uint256 tokenId) external;
    function isKettleAsset(address asset) external view returns (bool);

    // for tests
    function isValidOperator(address operator) external view returns (bool);
    function canTransfer(address user) external view returns (bool);
}
