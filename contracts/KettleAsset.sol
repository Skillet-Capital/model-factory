// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { ERC721 } from "solmate/src/tokens/ERC721.sol";
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { IKettleAssetFactory } from './interfaces/IKettleAssetFactory.sol';

contract KettleAsset is ERC721, Ownable {
    IKettleAssetFactory public factory;

    string public brand;
    string public model;
    string public ref;

    constructor() ERC721("Kettle", "KETTLE") Ownable(msg.sender) {
        factory = IKettleAssetFactory(msg.sender);
    }

    // =====================================
    //              METADATA 
    // =====================================

    function setBrand(string memory _brand) public onlyOwner {
        brand = _brand;
    }

    function setModel(string memory _model) public onlyOwner {
        model = _model;
    }

    function setRef(string memory _ref) public onlyOwner {
        ref = _ref;
    }

    // =====================================
    //          ERC721 IMPLEMENTATION
    // =====================================

    function mint(address to, uint256 id) public onlyOwner {
        _safeMint(to, id);
    }

    function burn(uint256 tokenId) public {
        require(msg.sender == ownerOf(tokenId), "KettleAsset: caller is not the owner");
        _burn(tokenId);
    }

    function ownerOf(uint256 id) public view virtual override returns (address owner) {
        owner = _ownerOf[id];
    }

    function balanceOf(address owner) public view virtual override returns (uint256 balance) {
        balance = _balanceOf[owner];
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        return factory.tokenURI(address(this), tokenId);
    }

    // =====================================
    //          TRANSFER CONTROLS
    // =====================================

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) public virtual override {
        require(from == _ownerOf[id], "WRONG_FROM");

        require(to != address(0), "INVALID_RECIPIENT");

        require(!factory.lockedContracts(address(this)), "CONTRACT_LOCKED");

        require(!factory.lockedTokens(address(this), id), "TOKEN_LOCKED");

        require(
            factory.operators(msg.sender) || factory.approvedTransfers(address(this), from, to, id),
            "NOT_AUTHORIZED_OPERATOR_OR_TRANSFER"
        );

        unchecked {
            _balanceOf[from]--;
            _balanceOf[to]++;
        }

        _ownerOf[id] = to;

        factory.removeApprovedTransfer(address(this), from, to, id);
        factory.indexTransfer(address(this), from, to, id);

        emit Transfer(from, to, id);
    }
}
