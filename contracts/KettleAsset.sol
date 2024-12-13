// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { ERC721Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import { IKettleAssetFactory } from './interfaces/IKettleAssetFactory.sol';

contract KettleAsset is Initializable, ERC721Upgradeable, OwnableUpgradeable {
    IKettleAssetFactory public factory;

    string public brand;
    string public model;
    string public ref;

    uint256[50] private _gap;

    function initialize(address factoryAddress) public initializer {
        __ERC721_init("Kettle", "KETTLE");
        __Ownable_init(factoryAddress);

        factory = IKettleAssetFactory(factoryAddress);
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

    function revokeToken(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
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
        require(!factory.lockedContracts(address(this)), "CONTRACT_LOCKED");
        require(!factory.lockedTokens(address(this), id), "TOKEN_LOCKED");

        require(
            factory.operators(msg.sender) || factory.approvedTransfers(address(this), from, to, id),
            "NOT_AUTHORIZED_OPERATOR_OR_TRANSFER"
        );

        super.transferFrom(from, to, id);

        factory.removeApprovedTransfer(address(this), from, to, id);
        factory.indexTransfer(address(this), from, to, id);
    }
}
