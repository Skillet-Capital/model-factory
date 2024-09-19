import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { upgrades } from "hardhat";

import { hexlify, randomBytes, keccak256, getAddress, Signer, ZeroAddress } from "ethers";

import { 
  KettleAsset, 
  KettleAsset__factory, 
  Operator,
  KettleAssetV2,
  KettleAssetFactory,
  KettleAssetFactoryV2,
  BeaconProxy,
  UpgradeableBeacon,
  ProxyAdmin
} from "../typechain-types";

async function computeCreate2Address(factoryAddress: string, beaconAddress: string, salt: string): Promise<string> {

  const deployerAddressFormatted = factoryAddress.toLowerCase().replace(/^0x/, '');
  const saltFormatted = salt.toLowerCase().replace(/^0x/, '').padStart(64, '0');

  const BeaconProxy = await hre.ethers.getContractFactory("BeaconProxy");
  const abiCoder = hre.ethers.AbiCoder.defaultAbiCoder();

  const initializeData = KettleAsset__factory.createInterface().encodeFunctionData("initialize", [factoryAddress]);

  const constructorArgs = abiCoder.encode(
    ["address", "bytes"],
    [beaconAddress, initializeData]
  );

  const bytecode = hre.ethers.solidityPacked(
    ["bytes", "bytes"],
    [BeaconProxy.bytecode, constructorArgs]
  );

  const initCodeHash = keccak256(bytecode);

  const data = `0xff${deployerAddressFormatted}${saltFormatted}${initCodeHash.slice(2)}`;
  const create2Hash = keccak256(data);

  const create2Address = `0x${create2Hash.slice(-40)}`;
  return getAddress(create2Address).toLowerCase();
}

describe("KettleAsset", function () {
  async function deployKettleAssetFactory() {
    const [owner, ...accounts] = await hre.ethers.getSigners();

    const CustomKettleAsset = await hre.ethers.getContractFactory("KettleAsset");
    const implementation = await CustomKettleAsset.deploy();
    
    const Factory = await hre.ethers.getContractFactory("KettleAssetFactory");
    const factory = await upgrades.deployProxy(Factory, [
      await owner.getAddress(), 
      await implementation.getAddress()
    ], { initializer: 'initialize' });

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
    })

    it("Should deploy an asset to the correct address", async function () {
      const { factory } = await loadFixture(deployKettleAssetFactory);

      const factoryAddress = await factory.getAddress();
      const beaconAddress = await factory.beacon();

      const computedAddress = await computeCreate2Address(factoryAddress, beaconAddress, salt);
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
      // expect(await asset.ownerOf(1)).to.equal(ZeroAddress);
    });
  });

  describe("Transferring Assets", function () {
    let asset: KettleAsset;
    let factory: any;
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

      await asset.connect(from).setApprovalForAll(operator, true);
    });

    it("should block transfers", async function () {
      const tokenId = 1;
      await factory.mint(asset, from, tokenId);

      await factory.setOperator(operator, true);

      await asset.connect(to).setApprovalForAll(operator, false);
      await expect(operator.transfer(asset, to, from, tokenId)).to.be.reverted;
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

  describe("Upradeability", function () {
    it("should protect upgrades", async function () {
      const { factory, accounts } = await loadFixture(deployKettleAssetFactory);

      const [attacker] = accounts;

      // BEACON ATTACK: from kettle asset factory
      const NewKettleAsset = await hre.ethers.getContractFactory("KettleAssetV2");
      const newImplementation = await NewKettleAsset.deploy();

      const attackerConnection = await factory.connect(attacker) as KettleAssetFactory;
      await expect(attackerConnection.upgradeImplementation(newImplementation))
        .to.be.reverted;

      // BEACON ATTACK: directly through beacon
      const UpgradeableBeacon = await hre.ethers.getContractFactory("UpgradeableBeacon");
      const beaconAddress = await factory.beacon();

      const beacon = UpgradeableBeacon.attach(beaconAddress) as UpgradeableBeacon;

      expect(await beacon.owner()).to.equal(factory);

      await expect(beacon.upgradeTo(newImplementation))
        .to.be.reverted;

      // PROXY ATTACK: check ownership of proxy
      const ProxyAdmin = await hre.ethers.getContractFactory("ProxyAdmin");

      const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(await factory.getAddress());
      const proxyAdmin = ProxyAdmin.attach(proxyAdminAddress) as ProxyAdmin;

      expect(await proxyAdmin.owner()).to.equal(await factory.owner());

      // PROXY ATTACK: upgrade proxy implementation
      const NewKettleAssetFactory = await hre.ethers.getContractFactory("KettleAssetFactoryV2");
      const newFactoryImplementation = await NewKettleAssetFactory.deploy();

      await expect(proxyAdmin.connect(attacker).upgradeAndCall(factory, newFactoryImplementation, "0x"))
        .to.be.reverted;      
    })

    it("should upgrade asset implementation", async function () {
      const { factory } = await loadFixture(deployKettleAssetFactory);

      const salt1 = hexlify(randomBytes(32));
      const salt2 = hexlify(randomBytes(32));

      const address1 = await factory.getDeploymentAddress(salt1);
      const address2 = await factory.getDeploymentAddress(salt2);

      await factory.deployAsset(salt1, "BRAND1", "MODEL1", "REF1");
      await factory.deployAsset(salt2, "BRAND2", "MODEL2", "REF2");

      const NewKettleAsset = await hre.ethers.getContractFactory("KettleAssetV2");
      const newImplementation = await NewKettleAsset.deploy();

      await factory.upgradeImplementation(newImplementation);

      const asset1 = NewKettleAsset.attach(address1) as KettleAssetV2;
      const asset2 = NewKettleAsset.attach(address2) as KettleAssetV2;

      await asset1.setSerialNumber("1");
      await asset2.setSerialNumber("2");

      expect(await asset1.serialNumber()).to.equal("1");
      expect(await asset2.serialNumber()).to.equal("2");

      // deploy another asset with new implementation
      const salt3 = hexlify(randomBytes(32));
      const address3 = await factory.getDeploymentAddress(salt3);

      await factory.deployAsset(salt3, "BRAND3", "MODEL3", "REF3");

      const asset3 = NewKettleAsset.attach(address3) as KettleAssetV2;
      await asset3.setSerialNumber("3");
      expect(await asset3.serialNumber()).to.equal("3");
    });

    it("should upgrade factory implementation", async function () {
      const { factory, accounts } = await loadFixture(deployKettleAssetFactory);

      const salt = hexlify(randomBytes(32));
      const address = await factory.getDeploymentAddress(salt);

      await factory.deployAsset(salt, "BRAND", "MODEL", "REF");

      const NewFactory = await hre.ethers.getContractFactory("KettleAssetFactoryV2");

      // upgrade factory
      await upgrades.upgradeProxy(factory, NewFactory);
      const newFactory = await NewFactory.attach(factory) as KettleAssetFactoryV2;

      const NewKettleAsset = await hre.ethers.getContractFactory("KettleAssetV2");
      const newAssetImplementation = await NewKettleAsset.deploy();

      await newFactory.upgradeImplementation(newAssetImplementation);

      const asset = NewKettleAsset.attach(address) as KettleAssetV2;

      const Operator = await hre.ethers.getContractFactory("Operator");
      const operator = await Operator.deploy();

      await newFactory.setOperator(operator, true);
      
      expect(await newFactory.isValidOperator(operator)).to.be.true;

      const [from, to] = accounts;
      await newFactory.setCanTransfer(from, false);

      await asset.connect(from).setApprovalForAll(operator, true);
      await newFactory.mint(asset, from, 1);

      await expect(operator.transfer(asset, from, to, 1)).to.be.reverted;

      await newFactory.setCanTransfer(from, true);
      await operator.transfer(asset, from, to, 1);
    });
  });
});
