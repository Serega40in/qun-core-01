require("@nomicfoundation/hardhat-toolbox");

/** Local development only. Never put a real wallet private key in this file. */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" }
  }
};
