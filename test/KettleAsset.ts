import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

import { hexlify, randomBytes, keccak256, getAddress, Signer, ZeroAddress } from "ethers";

import { 
  KettleAsset, 
  KettleAsset__factory, 
  KettleAssetFactory,
  Operator
} from "../typechain-types";

function computeCreate2Address(factory: string, bytecode: string, salt: string): string {

  const deployerAddressFormatted = factory.toLowerCase().replace(/^0x/, '');
  const saltFormatted = salt.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const initCodeHash = keccak256(bytecode);

  const data = `0xff${deployerAddressFormatted}${saltFormatted}${initCodeHash.slice(2)}`;
  const create2Hash = keccak256(data);

  const create2Address = `0x${create2Hash.slice(-40)}`;
  return getAddress(create2Address).toLowerCase();
}

describe("KettleAsset", function () {
  async function deployKettleAssetFactory() {
    const [owner, ...accounts] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory("KettleAssetFactory");
    const factory = await Factory.deploy(owner);

    return { owner, accounts, factory };
  }

  describe("Deployment", function () {
    it("Should deploy the factory with correct owner and roles", async function () {
      const { owner, factory } = await loadFixture(deployKettleAssetFactory);

      const MINTER_ROLE = await factory.MINTER_ROLE();

      expect(await factory.owner()).to.equal(owner);
      expect(await factory.roles(owner, MINTER_ROLE)).to.be.true;
    });

    it("Should transfer ownership to another account", async function () {
      const { accounts, factory } = await loadFixture(deployKettleAssetFactory);

      const [newOwner] = accounts;

      await factory.transferOwnership(newOwner);
      expect(await factory.owner()).to.equal(newOwner);
    });

    it("Should set and revoke roles", async function () {
      const { accounts, factory } = await loadFixture(deployKettleAssetFactory);

      const [minter] = accounts;

      const MINTER_ROLE = await factory.MINTER_ROLE();

      await factory.setRole(MINTER_ROLE, minter, true);
      expect(await factory.roles(minter, MINTER_ROLE)).to.be.true;

      await factory.setRole(MINTER_ROLE, minter, false);
      expect(await factory.roles(minter, MINTER_ROLE)).to.be.false;
    });
  });

  describe("Deploying Assets", function () {
    let KettleAsset: KettleAsset__factory;
    let salt: string;

    beforeEach(async () => {
      KettleAsset = await hre.ethers.getContractFactory("KettleAsset");
      salt = hexlify(randomBytes(32));
      console.log(salt)
    })

    it("Should deploy an asset to the correct address", async function () {
      const { factory } = await loadFixture(deployKettleAssetFactory);

      const bytecode = KettleAsset.bytecode;

      const computedAddress = computeCreate2Address(await factory.getAddress(), bytecode, salt);
      const address = await factory.getDeploymentAddress(salt);

      await factory.deployAsset(salt, "BRAND", "MODEL", "REF");

      expect(await factory.isKettleAsset(address)).to.be.true;
      expect(address.toLowerCase()).to.equal(computedAddress);

      // check owner is factory
      const asset = KettleAsset.attach(address) as KettleAsset;
      expect(await asset.owner()).to.equal(factory);
    });

    it("Should deploy an asset and set metadata and token uris", async function () {
      const { factory } = await loadFixture(deployKettleAssetFactory);

      const address = await factory.getDeploymentAddress(salt);
      await factory.deployAsset(salt, "BRAND", "MODEL", "REF");

      const asset = KettleAsset.attach(address) as KettleAsset;
      expect(await asset.owner()).to.equal(factory);

      expect(await asset.model()).to.equal("MODEL");
      expect(await asset.brand()).to.equal("BRAND");
      expect(await asset.ref()).to.equal("REF");

      // update the asset metadata
      await factory.setMetadata(asset, "NEW_BRAND", "NEW_MODEL", "NEW_REF");

      expect(await asset.model()).to.equal("NEW_MODEL");
      expect(await asset.brand()).to.equal("NEW_BRAND");
      expect(await asset.ref()).to.equal("NEW_REF");

      // set and check token URI
      const baseURI = "https://example.com";

      expect(await asset.tokenURI(0)).to.equal(`${address}/0`.toLowerCase());

      await factory.setBaseURI(baseURI);
      expect(await asset.tokenURI(0)).to.equal(`${baseURI}/${address}/0`.toLowerCase());
    });

    it("Should mint from factory only", async function () {
      const { factory, accounts } = await loadFixture(deployKettleAssetFactory);
      const [account] = accounts;

      const address = await factory.getDeploymentAddress(salt);
      await factory.deployAsset(salt, "BRAND", "MODEL", "REF");

      const asset = KettleAsset.attach(address) as KettleAsset;

      // try to mint from asset
      await expect(asset.mint(account, 1))
        .to.be.reverted;

      // mint from factory
      await factory.mint(asset, account, 1);

      expect(await asset.ownerOf(1)).to.equal(account);
      expect(await asset.balanceOf(account)).to.equal(1);

      // test burn
      await asset.connect(account).burn(1);
      expect(await asset.balanceOf(account)).to.equal(0);
      expect(await asset.ownerOf(1)).to.equal(ZeroAddress);
    });
  });

  describe("Transferring Assets", function () {
    let asset: KettleAsset;
    let factory: KettleAssetFactory;
    let operator: Operator;

    let accounts: Signer[];
    let from: Signer;
    let to: Signer;

    beforeEach(async () => {
      ({ factory, accounts } = await loadFixture(deployKettleAssetFactory));
      [from, to] = accounts;

      const salt = hexlify(randomBytes(32));
      const address = await factory.getDeploymentAddress(salt);

      await factory.deployAsset(salt, "BRAND", "MODEL", "REF");

      const KettleAsset = await hre.ethers.getContractFactory("KettleAsset");
      asset = KettleAsset.attach(address) as KettleAsset;

      const Operator = await hre.ethers.getContractFactory("Operator");
      operator = await Operator.deploy();
    });

    it("should transfer an asset to another account through valid operator", async function () {
      const tokenId = 1;
      await factory.mint(asset, from, tokenId);

      // set operator privileges
      await factory.setOperator(operator, true);
      await operator.transfer(asset, from, to, tokenId);
      expect(await asset.ownerOf(tokenId)).to.equal(to);

      // revoke operator prvileges
      await factory.setOperator(operator, false);
      await expect(operator.transfer(asset, to, from, tokenId))
        .to.be.revertedWith("NOT_AUTHORIZED_OPERATOR_OR_TRANSFER");
    });

    it("should transfer an asset to another account with approved transfer", async function () {
      const tokenId = 1;
      await factory.mint(asset, from, tokenId);

      // set operator privileges to skip primary check
      await factory.setOperator(operator, true);

      await expect(asset.connect(from).transferFrom(from, to, tokenId))
        .to.be.revertedWith("NOT_AUTHORIZED_OPERATOR_OR_TRANSFER");

      await factory.setApprovedTransfer(asset, from, to, tokenId, true);
      expect(await factory.approvedTransfers(asset, from, to, tokenId)).to.be.true;

      await asset.connect(from).transferFrom(from, to, tokenId);
      expect(await factory.approvedTransfers(asset, from, to, tokenId)).to.be.false;
      expect(await asset.ownerOf(tokenId)).to.equal(to);
    });

    it("should block transfers for locked contracts and tokens", async function () {
      const tokenId = 1;
      await factory.mint(asset, from, tokenId);

      // set operator privileges to skip primary check
      await factory.setOperator(operator, true);

      await factory.lockContract(asset, true);
      await expect(operator.transfer(asset, from, to, tokenId))
        .to.be.revertedWith("CONTRACT_LOCKED");

      await factory.lockContract(asset, false);
      await factory.lockToken(asset, tokenId, true);
      await expect(operator.transfer(asset, from, to, tokenId))
        .to.be.revertedWith("TOKEN_LOCKED");
    });
  });
});
