import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./ProxyModule";

const kettleAssetFactoryInitialization = buildModule("kettle_asset_factory_init_dev", (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const account = m.getAccount(0);

  const factory = m.contractAt("KettleAssetFactory", proxy);

  const implementation = m.contract("KettleAsset", [], { id: "asset" });

  m.call(factory, "initialize", [account, implementation]);

  m.call(factory, "setOperator", ["0x34C6507f5862b1fcdf2Ce837583969A93740b937", true]);

  return { factory, proxy, proxyAdmin };
});

export default kettleAssetFactoryInitialization;
