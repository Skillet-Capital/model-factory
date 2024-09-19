import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-tracer";

import dotenv from "dotenv";
dotenv.config();

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
      forking: {
        url: "https://lingering-indulgent-replica.blast-mainnet.quiknode.pro/6667a8f4be701cb6549b415d567bc706fb2f13a8/"
      },
      allowUnlimitedContractSize: true
    },
    blast: {
      url: 'https://lingering-indulgent-replica.blast-mainnet.quiknode.pro/6667a8f4be701cb6549b415d567bc706fb2f13a8/',
      accounts: [
        process.env.PK!
      ]
    },
    blast_sepolia: {
      url: `https://sepolia.blast.io`,
      accounts: [
        process.env.PK!,
      ]
    },
  },
  ignition: {
    strategyConfig: {
      create2: {
        salt: "0x93f5329437228ea921a55a2352c28de36cb40e90ed3dd0ef5a7809b4f38a958b",
      },
    },
  },
  etherscan: {
    apiKey: {
      blast_sepolia: "blast_sepolia",
      blast: "PTQ5343WRG7127WRWQUQMBABZHDSZUTPFW"
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
      }
    ]
  },
};

export default config;
