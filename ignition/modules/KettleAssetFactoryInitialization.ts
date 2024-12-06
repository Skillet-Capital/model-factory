import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import proxyModule from "./ProxyModule";

const kettleAssetFactoryInitialization = buildModule("KettleAssetFactoryInitialization", (m) => {
  const { proxy, proxyAdmin } = m.useModule(proxyModule);

  const account = m.getAccount(0);

  const factory = m.contractAt("KettleAssetFactory", proxy);

  const implementation = m.contract("KettleAsset", [], { id: "asset" });

  m.call(factory, "initialize", [account, implementation]);

  m.call(factory, "setOperator", ["0x5aBe43c199E67cA55061fc90fd29d8F0B4403175", true]);

  m.call(factory, "setOperator", ["0x962fb97954a5d9cc6801a724ce783ea639d90d2e", true], { id: "redemptionManager" });

  m.call(factory, "setOperator", ["0xE2e91f1F1E2095e33d4DFf1E87FFB9Da21498098", true], { id: "kettle_v2" });

  m.call(factory, "setOperator", ["0x26d573FdebAc88D4487F4635A3a573a934a0048a", true], { id: "kettle_v2_1" });

  m.call(factory, "setOperator", ["0x14fc7A3A449468C35E8a9c9432F68c378E6485BE", true], { id: "kettle_v2_2" });

  return { factory, proxy, proxyAdmin };
});

export default kettleAssetFactoryInitialization;
