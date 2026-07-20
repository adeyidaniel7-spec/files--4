/**
 * Checkout Relayer - Backend endpoint that receives signatures from frontend
 * and relays transactions on behalf of the user (admin pays gas)
 */

const express = require("express");
const { ethers } = require("ethers");
const router = express.Router();

// --- Config ---------------------------------------------------------

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const CHECKOUT_CONTRACT_ADDRESS = process.env.CHECKOUT_CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY; // Admin wallet that pays gas

// Admin wallet (signer that pays for gas)
const adminProvider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const adminSigner = new ethers.Wallet(ADMIN_PRIVATE_KEY, adminProvider);

console.log("Relayer admin address:", adminSigner.address);

/**
 * POST /api/orders/execute-payment
 *
 * Receives a signed Permit2 message from frontend and relays it to the blockchain.
 * Admin pays the gas fee.
 */
router.post("/api/orders/execute-payment", async (req, res) => {
  try {
    const { userAddress, tokenAddress, amount, nonce, deadline, signature } = req.body;

    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("📝 PAYMENT RELAYING STARTED");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`User Address:      ${userAddress}`);
    console.log(`Token Address:     ${tokenAddress}`);
    console.log(`Amount (wei):      ${amount}`);
    console.log(`Nonce:             ${nonce}`);
    console.log(`Deadline:          ${deadline}`);
    console.log(`Signature Length:  ${signature?.length || 0} chars`);

    // Validate inputs
    if (!userAddress || !tokenAddress || !amount || !nonce || !deadline || !signature) {
      console.error("❌ Missing required fields in request");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Encode the transaction data to call pay() on contract
    const contractInterface = new ethers.Interface([
      "function pay(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes signature) external",
    ]);

    const txData = contractInterface.encodeFunctionData("pay", [
      tokenAddress,
      amount,
      nonce,
      deadline,
      signature,
    ]);

    console.log(`\n🔗 Encoding transaction data...`);
    console.log(`Contract Address:  ${CHECKOUT_CONTRACT_ADDRESS}`);
    console.log(`Admin Signer:      ${adminSigner.address}`);

    // Admin/relayer sends the transaction (pays gas)
    console.log(`\n⛽ Sending transaction from admin wallet...`);
    const tx = await adminSigner.sendTransaction({
      to: CHECKOUT_CONTRACT_ADDRESS,
      data: txData,
    });

    console.log(`✅ Transaction sent successfully!`);
    console.log(`Transaction Hash:  ${tx.hash}`);
    console.log(`From:              ${tx.from}`);
    console.log(`To:                ${tx.to}`);

    // Return txHash to frontend so it can poll for confirmation
    console.log(`📤 Sending response to frontend...`);
    res.json({
      success: true,
      txHash: tx.hash,
      message: "Payment relayed successfully",
    });
    
    console.log("═══════════════════════════════════════════════════════════\n");

  } catch (err) {
    console.error(`\n❌ PAYMENT RELAYING FAILED`);
    console.error(`Error Message:  ${err.message}`);
    console.error(`Error Code:     ${err.code}`);
    console.error(`Full Error:     ${JSON.stringify(err, null, 2)}`);
    console.error("═══════════════════════════════════════════════════════════\n");
    
    res.status(500).json({
      error: err.message || "Failed to relay payment",
    });
  }
});

module.exports = router;
