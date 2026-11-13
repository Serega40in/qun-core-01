const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QUNToken prototype", function () {
  async function deploy() {
    const [owner, alice, bob, stranger] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("QUNToken");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();
    return { token, owner, alice, bob, stranger };
  }

  it("starts with the expected name, symbol and initial supply", async function () {
    const { token, owner } = await deploy();
    expect(await token.name()).to.equal("QUN");
    expect(await token.symbol()).to.equal("QUN");
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("100000000"));
    expect(await token.cap()).to.equal(ethers.parseEther("1000000000"));
  });

  it("allows a user-to-user transfer", async function () {
    const { token, alice, bob } = await deploy();
    await token.transfer(alice.address, ethers.parseEther("250"));
    await token.connect(alice).transfer(bob.address, ethers.parseEther("40"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("210"));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("40"));
  });

  it("rejects a zero-address owner", async function () {
    const Token = await ethers.getContractFactory("QUNToken");
    await expect(Token.deploy(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(Token, "OwnableInvalidOwner");
  });

  it("restricts minting to the owner", async function () {
    const { token, alice, stranger } = await deploy();
    await expect(token.connect(stranger).mint(alice.address, 1n))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("rejects minting to the zero address", async function () {
    const { token } = await deploy();
    await expect(token.mint(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
  });

  it("rejects transfers to the zero address", async function () {
    const { token } = await deploy();
    await expect(token.transfer(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
  });

  it("rejects approvals to the zero address", async function () {
    const { token } = await deploy();
    await expect(token.approve(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(token, "ERC20InvalidSpender");
  });

  it("cannot mint above the hard cap", async function () {
    const { token, owner, alice } = await deploy();
    const remaining = (await token.cap()) - (await token.totalSupply());
    await token.mint(alice.address, remaining);
    await expect(token.mint(owner.address, 1n))
      .to.be.revertedWithCustomError(token, "ERC20ExceededCap");
  });
});
