import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import kettleAssetFactoryInitialization from "./KettleAssetFactoryInitialization";

const deployAssetModule = buildModule("deploy_asset_dev", (m) => {
  const { factory } = m.useModule(kettleAssetFactoryInitialization);

  const deploy = m.call(factory, "deployAsset", [
    "0x0c6da968e8e884749021d15e40656d4cd51ba2942fd2a2a2a37931dbfb4f671f", // Salt
    "BRAND", // Brand
    "MODEL", // Model
    "REF"    // Reference
  ]);

  const proxy = m.readEventArgument(deploy, "KettleAssetDeployed", "asset");

  const asset = m.contractAt("KettleAsset", proxy);

  return { asset };
});

export default deployAssetModule;
