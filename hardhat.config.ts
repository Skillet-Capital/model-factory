import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
import "hardhat-tracer";

import dotenv from "dotenv";
dotenv.config();

import { PROD_SALT, DEV_SALT } from "./salts";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
            details: {
              yulDetails: {
                optimizerSteps: "u",
              },
            },
          },
        },
      },
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    ...(process.env.PK && process.env.BLAST_RPC && {
      blast: {
        url: process.env.BLAST_RPC,
        accounts: [
          process.env.PK!
        ]
      }
    }),
    ...(process.env.PK && process.env.BASE_RPC && {
      base: {
        url: process.env.BASE_RPC,
        accounts: [
          process.env.PK!
        ]
      }
    }),
  },
  ignition: {
    strategyConfig: {
      create2: {
        salt: DEV_SALT,
      },
    },
  },
  etherscan: {
    apiKey: {
      blast_sepolia: "blast_sepolia",
      blast: "PTQ5343WRG7127WRWQUQMBABZHDSZUTPFW",
      base: "228ZGK626T79PAIYKYFI631RIW2NMY52BT"
    },
    customChains: [
      {
        network: "blast_sepolia",
        chainId: 168587773,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan",
          browserURL: "https://testnet.blastscan.io"
        }
      },
      {
        network: "blast",
        chainId: 81457,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/81457/etherscan",
          browserURL: "https://blastscan.io"
        }
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  },
};

export default config;
