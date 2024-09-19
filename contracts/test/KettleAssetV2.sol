// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { KettleAsset } from '../KettleAsset.sol';

contract KettleAssetV2 is KettleAsset {
    string public serialNumber;

    function setSerialNumber(string memory _serialNumber) public {
        serialNumber = _serialNumber;
    }
    
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(factory.canTransfer(from), "KettleAssetV2: user cannot approved");
        super.transferFrom(from, to, tokenId);
    }
}
