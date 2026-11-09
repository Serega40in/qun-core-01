const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const baseTokenURI = process.env.QUN_NFT_BASE_URI || "";

  const Token = await ethers.getContractFactory("QUNToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const MemberNFT = await ethers.getContractFactory("QUNMemberNFT");
  const membership = await MemberNFT.deploy(deployer.address, baseTokenURI);
  await membership.waitForDeployment();

  const Payroll = await ethers.getContractFactory("QUNPayroll");
  const payroll = await Payroll.deploy(
    await token.getAddress(),
    await membership.getAddress(),
    deployer.address
  );
  await payroll.waitForDeployment();

  const network = await ethers.provider.getNetwork();
  console.log("QUN Economy MVP deployed");
  console.log("Network:", network.name, "chainId:", network.chainId.toString());
  console.log("Admin:", deployer.address);
  console.log("QUNToken:", await token.getAddress());
  console.log("QUNMemberNFT:", await membership.getAddress());
  console.log("QUNPayroll:", await payroll.getAddress());
  console.log("Initial QUN supply:", ethers.formatEther(await token.totalSupply()));
  console.log("Payroll reserve starts at 0; fund it explicitly after deployment.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
