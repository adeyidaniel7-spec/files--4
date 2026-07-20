/**
 * Deploy script for CheckoutPermit2 — production deployment.
 *
 * Usage:
 *   RECEIVER_ADDRESS=0xYourRealReceivingWallet \
 *   MAINNET_RPC_URL=https://... \
 *   DEPLOYER_PRIVATE_KEY=0x... \
 *   npx hardhat run scripts/deploy.js --network mainnet
 *
 * IMPORTANT: RECEIVER_ADDRESS must be a wallet YOU control and can
 * verify — this is where every customer payment will land, permanently
 * (it's immutable once deployed, per the contract design). Triple-check
 * this address before running against mainnet.
 */

const { ethers } = require("hardhat");

// Real Permit2 — same address on every EVM chain it's deployed to.
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA";

async function main() {
  const receiverAddress = process.env.RECEIVER_ADDRESS;

  if (!receiverAddress || !ethers.utils.isAddress(receiverAddress)) {
    throw new Error(
      "Set RECEIVER_ADDRESS to a valid, real wallet address you control before deploying."
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Receiver (funds destination):", receiverAddress);
  console.log("Permit2 address:", PERMIT2_ADDRESS);

  const CheckoutPermit2 = await ethers.getContractFactory("CheckoutPermit2");
  const checkout = await CheckoutPermit2.deploy(receiverAddress, PERMIT2_ADDRESS);
  await checkout.deployed();

  console.log("\nCheckoutPermit2 deployed to:", checkout.address);
  console.log("\nNext steps:");
  console.log("1. Verify this address on Etherscan:");
  console.log(
    `   npx hardhat verify --network mainnet ${checkout.address} ${receiverAddress} ${PERMIT2_ADDRESS}`
  );
  console.log("2. Update CHECKOUT_CONTRACT_ADDRESS in checkoutPermit2Signing.js to:", checkout.address);
  console.log("3. Update CHECKOUT_CONTRACT_ADDRESS in checkoutBackend.js to:", checkout.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});