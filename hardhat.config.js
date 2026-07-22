require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      forking: process.env.RPC_URL || process.env.MAINNET_RPC_URL
        ? { url: process.env.RPC_URL || process.env.MAINNET_RPC_URL }
        : undefined,
    },
    sepolia: {
      url: process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY ? [process.env.ADMIN_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};
