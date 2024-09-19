// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import { ERC721 } from '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { Strings } from '@openzeppelin/contracts/utils/Strings.sol';

import { KettleAsset } from './KettleAsset.sol';

contract KettleAssetFactory is Ownable {
    using Strings for uint256;

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

    string public BASE_URI;
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    mapping(address => bool) public isKettleAsset;
    mapping(address => mapping(bytes32 => bool)) public roles;

    mapping(address => bool) public operators;
    mapping(address => bool) public lockedContracts;
    mapping(address => mapping(uint256 => bool)) public lockedTokens;
    mapping(address => mapping(address => mapping(address => mapping(uint256 => bool)))) public approvedTransfers;

    constructor(address owner) Ownable(owner) {
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
    ) public onlyOwner returns (KettleAsset asset) {
        bytes memory bytecode = abi.encodePacked(
            type(KettleAsset).creationCode
        );

        address addr = _deploy(bytecode, salt);
        asset = KettleAsset(addr);

        asset.setBrand(brand);
        asset.setModel(model);
        asset.setRef(ref);

        isKettleAsset[addr] = true;
        emit KettleAssetDeployed(addr, brand, model, ref);
    }

    function _deploy(bytes memory bytecode, bytes32 salt) internal returns (address addr) {
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
    }

    function getDeploymentAddress(bytes32 salt) external view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(KettleAsset).creationCode
        );

        bytes32 _hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        return address(uint160(uint256(_hash)));
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
        require(roles[msg.sender][role], "KettleAssetFactory: sender does not have role");
        _;
    }

    modifier onlyKettleAsset(address asset) {
        require(isKettleAsset[asset], "KettleAssetFactory: asset not registered");
        _;
    }

    modifier onlyOwnerOrKettleAsset(address asset) {
        require(isKettleAsset[asset] || msg.sender == owner(), "KettleAssetFactory: sender is not owner or registered asset");
        _;
    }
}
