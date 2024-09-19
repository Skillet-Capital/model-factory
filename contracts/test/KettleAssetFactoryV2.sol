// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { KettleAssetFactory } from '../KettleAssetFactory.sol';

contract KettleAssetFactoryV2 is KettleAssetFactory {
    mapping(address => bool) public canTransfer;
    
    function isValidOperator(address operator) public view returns (bool) {
        return operators[operator];
    }

    function setCanTransfer(address user, bool approved) public onlyOwner {
        canTransfer[user] = approved;
    }
}
