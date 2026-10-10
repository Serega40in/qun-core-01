const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("QUNToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  console.log("QUN test token deployed");
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("Owner:", deployer.address);
  console.log("Contract:", await token.getAddress());
  console.log("Initial supply:", ethers.formatEther(await token.totalSupply()), "QUN");
  console.log("Max supply:", ethers.formatEther(await token.cap()), "QUN");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
