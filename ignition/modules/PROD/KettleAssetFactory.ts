import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./ProxyModule";

const kettleAssetFactoryInitialization = buildModule("kettle_asset_factory_init_prod", (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const account = m.getAccount(0);

  const factory = m.contractAt("KettleAssetFactory", proxy);

  const implementation = m.contract("KettleAsset", [], { id: "asset" });

  m.call(factory, "initialize", [account, implementation]);

  m.call(factory, "setOperator", ["0x0d5212403Be4dA94765e7b75F5842ff2290e34E1", true]);
  m.call(factory, "setOperator", ["0xc5d387CAD90F2B962D562ab4DFB2b9F8805355ee", true], { id: "bridge_operator"});

  m.call(factory, "setApprovedTransfer", [
    "0x14c7fd5669d2c441fabbbd16624838efe5c2b26c",
    "0x7e4a82326dcb5f40851dcf67b145a3ee68fb1d19",
    "0x6b83081D6Dd1b817B8c44535578C4C7bA765D675",
    "100001",
    true
  ], { id: "approved_transfer_1" });

  return { factory, proxy, proxyAdmin };
});

export default kettleAssetFactoryInitialization;
