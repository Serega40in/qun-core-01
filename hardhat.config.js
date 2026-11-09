require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const networks = {
  hardhat: {},
  localhost: { url: "http://127.0.0.1:8545" }
};

if (process.env.QUN_TESTNET_RPC_URL) {
  const testnet = {
    url: process.env.QUN_TESTNET_RPC_URL,
    accounts: process.env.QUN_DEPLOYER_PRIVATE_KEY
      ? [process.env.QUN_DEPLOYER_PRIVATE_KEY]
      : []
  };

  if (process.env.QUN_TESTNET_CHAIN_ID) {
    testnet.chainId = Number(process.env.QUN_TESTNET_CHAIN_ID);
  }

  networks.qunTestnet = testnet;
}

/** Never place production wallet keys in this file or commit them to Git. */
module.exports = {
  solidity: "0.8.24",
  networks
};
