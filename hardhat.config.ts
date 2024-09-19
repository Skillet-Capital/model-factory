import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

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
            runs: 1000,
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
      accounts: [
        {
          privateKey: process.env.PK!,
          balance: "10000000000000000000000"
        }
      ]
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
        salt: "0x4d7fb4036ce8795b3069e5779fcfbed954a633bc310dfa2ccf8f89246a9c07d2",
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
          apiURL: "https://api.blastscan.io/api",
          browserURL: "https://blastscan.io"
        }
      }
    ]
  },
};

export default config;
