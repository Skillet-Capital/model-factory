// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { ERC721 } from "solmate/src/tokens/ERC721.sol";

contract Operator {

    function transfer(
        ERC721 collection,
        address from,
        address to,
        uint256 tokenId
    ) public {
        collection.safeTransferFrom(from, to, tokenId);
    }
}
