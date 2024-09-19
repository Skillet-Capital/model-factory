// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import { UpgradeableBeacon } from "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import { BeaconProxy } from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import { ProxyAdmin } from "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import { TransparentUpgradeableProxy } from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";

import { KettleAsset } from './KettleAsset.sol';

contract KettleAssetFactory is Initializable, OwnableUpgradeable {
    using Strings for uint256;

    address public kettleAssetImplementation;
    UpgradeableBeacon public beacon;

    string public BASE_URI;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    mapping(address => bool) public isKettleAsset;
    mapping(address => mapping(bytes32 => bool)) public roles;

    mapping(address => bool) public operators;
    mapping(address => bool) public lockedContracts;
    mapping(address => mapping(uint256 => bool)) public lockedTokens;
    mapping(address => mapping(address => mapping(address => mapping(uint256 => bool)))) public approvedTransfers;

    uint256[50] private _gap;

    event KettleAssetDeployed(
        address indexed asset,
        string brand,
        string model,
        string ref
    );

    event KettleAssetTransferred(
        address indexed asset,
        address indexed from,
        address indexed to,
        uint256 tokenId
    );

    event OperatorWhitelisted(
        address indexed operator,
        bool approved
    );

    event RoleGranted(
        address indexed account,
        bytes32 role,
        bool privilege
    );

    event TransferApproved(
        address indexed asset,
        address indexed from,
        address indexed to,
        uint256 tokenId,
        bool approved
    );

    event ContractLocked(
        address indexed asset,
        bool locked
    );

    event TokenLocked(
        address indexed asset,
        uint256 tokenId,
        bool locked
    );

    function initialize(address owner, address _implementation) public initializer {
        __Ownable_init(owner);

        kettleAssetImplementation = _implementation;
        beacon = new UpgradeableBeacon(kettleAssetImplementation, address(this));

        roles[owner][MINTER_ROLE] = true;
    }
    
    // =====================================
    //          FACTORY METHODS
    // =====================================

    function deployAsset(
        bytes32 salt,
        string memory brand, 
        string memory model, 
        string memory ref
    ) public onlyOwner returns (address proxy) {
        bytes memory data = abi.encodeWithSelector(
            KettleAsset.initialize.selector,
            address(this)
        );

        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            abi.encode(address(beacon), data)
        );

        proxy = Create2.deploy(0, salt, bytecode);
        require(proxy != address(0), "KettleAssetFactory: Failed to deploy proxy");

        KettleAsset asset = KettleAsset(proxy);

        asset.setBrand(brand);
        asset.setModel(model);
        asset.setRef(ref);

        isKettleAsset[proxy] = true;

        emit KettleAssetDeployed(proxy, brand, model, ref);
    }

    function getDeploymentAddress(bytes32 salt) external view returns (address) {
        bytes memory data = abi.encodeWithSelector(
            KettleAsset.initialize.selector,
            address(this)
        );

        bytes memory bytecode = abi.encodePacked(
            type(BeaconProxy).creationCode,
            abi.encode(address(beacon), data)
        );

        return Create2.computeAddress(salt, keccak256(bytecode), address(this));
    }

    // =====================================
    //              PROXY ADMIN
    // =====================================

    function upgradeImplementation(address newImplementation) public onlyOwner {
        require(newImplementation != address(0), "KettleAssetFactory: new implementation is the zero address");
        
        beacon.upgradeTo(newImplementation);

        kettleAssetImplementation = newImplementation;
    }

    // =====================================
    //          ACCESS CONTROL
    // =====================================

    function setRole(bytes32 role, address account, bool privilege) public onlyOwner {
        roles[account][role] = privilege;
        emit RoleGranted(account, role, privilege);
    }

    // =====================================
    //           OPERATOR CONTROL
    // =====================================

    function setOperator(address operator, bool approved) public onlyOwner {
        operators[operator] = approved;
        emit OperatorWhitelisted(operator, approved);
    }

    function setApprovedTransfer(
        address asset,
        address from,
        address to,
        uint256 tokenId,
        bool approved
    ) public onlyOwner {
        approvedTransfers[asset][from][to][tokenId] = approved;
        emit TransferApproved(asset, from, to, tokenId, approved);
    }

    function removeApprovedTransfer(
        address asset,
        address from,
        address to,
        uint256 tokenId
    ) public onlyOwnerOrKettleAsset(asset) {
        approvedTransfers[asset][from][to][tokenId] = false;
        emit TransferApproved(asset, from, to, tokenId, false);
    }

    // =====================================
    //           SUPPLY CONTROL
    // =====================================

    function mint(address asset, address to, uint256 id) public hasRole(MINTER_ROLE) {
        KettleAsset(asset).mint(to, id);
    }

    function indexTransfer(
        address asset,
        address from,
        address to,
        uint256 tokenId
    ) external onlyKettleAsset(asset) {
        emit KettleAssetTransferred(asset, from, to, tokenId);
    }

    // =====================================
    //           TRANSFER CONTROLS
    // =====================================

    function lockContract(address asset, bool locked) public onlyOwner() {
        lockedContracts[asset] = locked;
        emit ContractLocked(asset, locked);
    }

    function lockToken(address asset, uint256 tokenId, bool locked) public onlyOwner() {
        lockedTokens[asset][tokenId] = locked;
        emit TokenLocked(asset, tokenId, locked);
    }

    // =====================================
    //              METADATA
    // =====================================

    function setBaseURI(string memory _baseURI) public onlyOwner {
        BASE_URI = _baseURI;
    }

    function setMetadata(
        address asset,
        string memory brand,
        string memory model,
        string memory ref
    ) public onlyOwner {
        KettleAsset(asset).setBrand(brand);
        KettleAsset(asset).setModel(model);
        KettleAsset(asset).setRef(ref);
    }

    function tokenURI(address asset, uint256 tokenId) public view returns (string memory) { 
        string memory identifier = string.concat(
            Strings.toHexString(uint256(uint160(asset))),
            "/",
            Strings.toString(tokenId)
        );

        if (bytes(BASE_URI).length == 0) {
            return identifier;
        }

        return string.concat(BASE_URI, "/", identifier);
    }

    // =====================================
    //              MODIFIERS
    // =====================================

    modifier hasRole(bytes32 role) {
        require(roles[msg.sender][role], ""); //"KettleAssetFactory: sender does not have role");
        _;
    }

    modifier onlyKettleAsset(address asset) {
        require(isKettleAsset[asset], ""); //"KettleAssetFactory: asset not registered");
        _;
    }

    modifier onlyOwnerOrKettleAsset(address asset) {
        require(isKettleAsset[asset] || msg.sender == owner(), ""); //"KettleAssetFactory: sender is not owner or registered asset");
        _;
    }
}
