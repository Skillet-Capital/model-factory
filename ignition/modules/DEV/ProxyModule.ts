import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const proxyModule = buildModule("proxy_module_dev", (m) => {
  const account = m.getAccount(0);

  const factory = m.contract("KettleAssetFactory", [], { id: "factory" });

  const proxy = m.contract("TransparentUpgradeableProxy", [
    factory,
    account,
    "0x"
  ]);

  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxy, proxyAdmin };
});

export default proxyModule;
