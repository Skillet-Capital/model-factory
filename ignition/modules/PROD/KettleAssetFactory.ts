import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./ProxyModule";

const kettleAssetFactoryInitialization = buildModule("kettle_asset_factory_init_prod", (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const account = m.getAccount(0);

  const factory = m.contractAt("KettleAssetFactory", proxy);

  const implementation = m.contract("KettleAsset", [], { id: "asset" });

  m.call(factory, "initialize", [account, implementation]);

  m.call(factory, "setOperator", ["0x0d5212403Be4dA94765e7b75F5842ff2290e34E1", true]);

  return { factory, proxy, proxyAdmin };
});

export default kettleAssetFactoryInitialization;
