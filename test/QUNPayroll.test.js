const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("QUN membership and payroll MVP", function () {
  async function deployFixture() {
    const [owner, alice, bob, keeper, stranger] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("QUNToken");
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const MemberNFT = await ethers.getContractFactory("QUNMemberNFT");
    const membership = await MemberNFT.deploy(owner.address, "ipfs://qun-members/");
    await membership.waitForDeployment();

    const Payroll = await ethers.getContractFactory("QUNPayroll");
    const payroll = await Payroll.deploy(
      await token.getAddress(),
      await membership.getAddress(),
      owner.address
    );
    await payroll.waitForDeployment();

    const projectId = ethers.encodeBytes32String("QUN");
    const roleId = ethers.encodeBytes32String("CORE_TEAM");
    await membership.mintMember(alice.address, projectId, roleId);

    const now = await time.latest();
    const firstPaymentAt = now + 60;
    const monthlyAmount = ethers.parseEther("100");

    await payroll.setSchedule(1, monthlyAmount, firstPaymentAt);
    await token.approve(await payroll.getAddress(), ethers.parseEther("1000"));
    await payroll.fund(ethers.parseEther("1000"));

    return {
      owner, alice, bob, keeper, stranger,
      token, membership, payroll,
      firstPaymentAt, monthlyAmount
    };
  }

  it("issues a standard ERC-721 membership NFT with project and role data", async function () {
    const { membership, alice } = await deployFixture();

    expect(await membership.name()).to.equal("QUN Membership");
    expect(await membership.symbol()).to.equal("QUN-MEMBER");
    expect(await membership.ownerOf(1)).to.equal(alice.address);
    expect(await membership.isActive(1)).to.equal(true);

    const profile = await membership.profiles(1);
    expect(profile.projectId).to.equal(ethers.encodeBytes32String("QUN"));
    expect(profile.roleId).to.equal(ethers.encodeBytes32String("CORE_TEAM"));
    expect(profile.active).to.equal(true);
  });

  it("blocks transfers so a membership NFT cannot be sold or moved", async function () {
    const { membership, alice, bob } = await deployFixture();

    await expect(
      membership.connect(alice).transferFrom(alice.address, bob.address, 1)
    ).to.be.revertedWithCustomError(membership, "Soulbound");

    expect(await membership.ownerOf(1)).to.equal(alice.address);
  });

  it("restricts minting and payroll schedule changes to the owner", async function () {
    const { membership, payroll, bob, stranger, firstPaymentAt, monthlyAmount } =
      await deployFixture();

    await expect(
      membership.connect(stranger).mintMember(
        bob.address,
        ethers.encodeBytes32String("QUN"),
        ethers.encodeBytes32String("ADVISOR")
      )
    ).to.be.revertedWithCustomError(membership, "OwnableUnauthorizedAccount");

    await expect(
      payroll.connect(stranger).setSchedule(1, monthlyAmount, firstPaymentAt)
    ).to.be.revertedWithCustomError(payroll, "OwnableUnauthorizedAccount");
  });

  it("does not pay before the due time", async function () {
    const { payroll } = await deployFixture();

    await expect(payroll.pay(1)).to.be.revertedWithCustomError(
      payroll,
      "PaymentNotDue"
    );
  });

  it("pays the NFT holder once when a period becomes due", async function () {
    const { payroll, token, alice, firstPaymentAt, monthlyAmount } =
      await deployFixture();

    await time.increaseTo(firstPaymentAt);
    await payroll.connect(alice).pay(1);

    expect(await token.balanceOf(alice.address)).to.equal(monthlyAmount);

    const schedule = await payroll.schedules(1);
    expect(schedule.paidPeriods).to.equal(1);
    expect(schedule.nextPaymentAt).to.equal(
      BigInt(firstPaymentAt) + (await payroll.PAYMENT_PERIOD())
    );
  });

  it("catches up missed periods without allowing duplicate payment", async function () {
    const { payroll, token, alice, firstPaymentAt, monthlyAmount } =
      await deployFixture();

    await time.increaseTo(firstPaymentAt + 2 * 30 * 24 * 60 * 60);
    await payroll.pay(1);

    expect(await token.balanceOf(alice.address)).to.equal(monthlyAmount * 3n);

    const schedule = await payroll.schedules(1);
    expect(schedule.paidPeriods).to.equal(3);

    await payroll.payMany([1]);
    expect(await token.balanceOf(alice.address)).to.equal(monthlyAmount * 3n);
  });

  it("lets anyone execute a payment, but always pays the NFT owner", async function () {
    const { payroll, token, alice, keeper, firstPaymentAt, monthlyAmount } =
      await deployFixture();

    await time.increaseTo(firstPaymentAt);
    await payroll.connect(keeper).payMany([1]);

    expect(await token.balanceOf(alice.address)).to.equal(monthlyAmount);
    expect(await token.balanceOf(keeper.address)).to.equal(0n);
  });

  it("skips a revoked membership NFT during batch processing", async function () {
    const { payroll, membership, token, alice, firstPaymentAt } =
      await deployFixture();

    await membership.revokeMember(1);
    await time.increaseTo(firstPaymentAt);

    const tx = await payroll.payMany([1]);
    await tx.wait();

    expect(await token.balanceOf(alice.address)).to.equal(0n);
    const schedule = await payroll.schedules(1);
    expect(schedule.active).to.equal(true);
  });

  it("rejects direct payment for a revoked membership NFT", async function () {
    const { payroll, membership, firstPaymentAt } = await deployFixture();

    await membership.revokeMember(1);
    await time.increaseTo(firstPaymentAt);

    await expect(payroll.pay(1)).to.be.revertedWithCustomError(
      payroll,
      "InvalidMember"
    );
  });

  it("can cancel a schedule and rejects further payments", async function () {
    const { payroll, owner, firstPaymentAt } = await deployFixture();

    await payroll.connect(owner).cancelSchedule(1);
    await time.increaseTo(firstPaymentAt);

    await expect(payroll.pay(1)).to.be.revertedWithCustomError(
      payroll,
      "InvalidSchedule"
    );
  });
});
