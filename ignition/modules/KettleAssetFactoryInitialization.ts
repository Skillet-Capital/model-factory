import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./ProxyModule";

const kettleAssetFactoryInitialization = buildModule("KettleAssetFactoryInitialization", (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const account = m.getAccount(0);

  const factory = m.contractAt("KettleAssetFactory", proxy);

  const implementation = m.contract("KettleAsset", [], { id: "asset" });

  m.call(factory, "initialize", [account, implementation]);

  return { factory, proxy, proxyAdmin };
});

export default kettleAssetFactoryInitialization;
