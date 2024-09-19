import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "hardhat";

const KettleAssetFactoryModule = buildModule("KettleAssetFactoryModule", (m) => {
  const account = m.getAccount(0);
  const factory = m.contract("KettleAssetFactory", [account]);

  m.call(factory, "deployAsset", ["test", "BRAND", "MODEL", "REF"]);

  m.call(factory, "deployAsset", ["0x42a6b8ea53ce062c5e346b9e4e4395c7780d319a185638d861c1fb769dd331fb", "BRAND", "MODEL", "REF"], {
    id: "deployAssetWithSalt",
  });

  return { factory };
});

export default KettleAssetFactoryModule;
