const { ethers, network } = require("hardhat");

const PAYROLL_ABI = [
  "function schedules(uint256) view returns (uint128 amountPerPeriod, uint64 nextPaymentAt, uint64 paidPeriods, bool active)",
  "function payMany(uint256[] tokenIds) returns (uint256 processed)",
  "function membership() view returns (address)",
  "function MAX_BATCH_SIZE() view returns (uint256)"
];
const MEMBERSHIP_ABI = [
  "function isActive(uint256 tokenId) view returns (bool)"
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const payrollAddress = process.env.QUN_PAYROLL_ADDRESS;
  const tokenIds = (process.env.QUN_PAYROLL_TOKEN_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      if (!/^\d+$/.test(value)) throw new Error("Invalid NFT token ID: " + value);
      return BigInt(value);
    });

  if (!payrollAddress || !ethers.isAddress(payrollAddress)) {
    throw new Error("Set QUN_PAYROLL_ADDRESS to the deployed payroll contract address.");
  }
  if (tokenIds.length === 0) {
    throw new Error("Set QUN_PAYROLL_TOKEN_IDS, for example: 1,2,3");
  }

  let signer;
  if (process.env.QUN_KEEPER_PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.QUN_KEEPER_PRIVATE_KEY, ethers.provider);
  } else if (network.name === "localhost" || network.name === "hardhat") {
    [signer] = await ethers.getSigners();
    console.warn("Using a public Hardhat development account. Never use it on a real network.");
  } else {
    throw new Error("Set QUN_KEEPER_PRIVATE_KEY for non-local networks.");
  }

  const payroll = new ethers.Contract(payrollAddress, PAYROLL_ABI, signer);
  const membershipAddress = await payroll.membership();
  const membership = new ethers.Contract(membershipAddress, MEMBERSHIP_ABI, ethers.provider);
  const maxBatchSize = Number(await payroll.MAX_BATCH_SIZE());
  const pollMs = Math.max(5_000, Number(process.env.QUN_KEEPER_POLL_MS || 60_000));
  const once = process.env.QUN_KEEPER_ONCE === "1";

  async function checkAndPay() {
    const block = await ethers.provider.getBlock("latest");
    if (!block) throw new Error("Could not read the latest block.");

    const dueIds = [];
    for (let i = 0; i < tokenIds.length; i += maxBatchSize) {
      const batch = tokenIds.slice(i, i + maxBatchSize);
      for (const tokenId of batch) {
        const [schedule, active] = await Promise.all([
          payroll.schedules(tokenId),
          membership.isActive(tokenId)
        ]);
        if (schedule.active && active && schedule.nextPaymentAt <= BigInt(block.timestamp)) {
          dueIds.push(tokenId);
        }
      }
    }

    if (dueIds.length === 0) {
      console.log(new Date().toISOString(), "No QUN payroll payments due.");
      return;
    }

    for (let i = 0; i < dueIds.length; i += maxBatchSize) {
      const batch = dueIds.slice(i, i + maxBatchSize);
      console.log("Processing due membership NFTs:", batch.map(String).join(", "));
      const tx = await payroll.payMany(batch);
      const receipt = await tx.wait();
      console.log("Payroll transaction:", receipt.hash);
    }
  }

  if (once) {
    await checkAndPay();
    return;
  }

  console.log(
    "QUN payroll keeper started on",
    network.name,
    "poll interval:",
    pollMs,
    "ms"
  );

  while (true) {
    try {
      await checkAndPay();
    } catch (error) {
      console.error("Keeper check failed:", error.shortMessage || error.message || error);
    }
    await sleep(pollMs);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
