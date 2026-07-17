/**
 * Backend: order total + nonce management for CheckoutPermit2 flow.
 * Node.js / Express + ethers v5. Adjust for your stack as needed.
 *
 * Why this matters: the frontend must never be trusted to say how much
 * an order costs. The signed `amount` the customer sees in their wallet
 * has to come from server-side order data, or a compromised/malicious
 * client could ask the customer to sign a different amount than what
 * they actually owe.
 */

const express = require("express");
const { ethers } = require("ethers");
const router = express.Router();

// --- Config ---------------------------------------------------------

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const PERMIT2_ABI = [
  "function nonceBitmap(address owner, uint256 wordPos) view returns (uint256)",
];

const CHECKOUT_CONTRACT_ADDRESS = process.env.CHECKOUT_CONTRACT_ADDRESS;
const CHECKOUT_ABI = [
  "event PaymentReceived(address indexed payer, address indexed token, uint256 amount, uint256 nonce)",
];

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const permit2 = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, provider);
const checkoutInterface = new ethers.utils.Interface(CHECKOUT_ABI);

// --- 1. Server-computed order total ----------------------------------

/**
 * GET /api/orders/:orderId/checkout-quote
 *
 * Returns the authoritative amount (and token) the customer must sign
 * for. Pulled from your own order/cart records — never from anything
 * the client sends in this request.
 */
router.get("/api/orders/:orderId/checkout-quote", async (req, res) => {
  const { orderId } = req.params;

  // Replace with your real order lookup (DB, cart service, etc.)
  const order = await getOrderById(orderId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "pending_payment") {
    return res.status(409).json({ error: "Order is not payable" });
  }

  // Convert your stored order total into the token's smallest unit.
  // Example assumes order.totalUsdc is a decimal string like "49.99"
  // and the token has 6 decimals (USDC).
  const amountWei = ethers.utils.parseUnits(order.totalUsdc, 6).toString();

  // Short-lived quote so the price can't be replayed indefinitely.
  const quoteExpiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

  // Persist this quote so /api/orders/:orderId/confirm can verify the
  // transaction that eventually comes in actually matches it.
  await saveCheckoutQuote(orderId, {
    tokenAddress: order.tokenAddress,
    amountWei,
    expiresAt: quoteExpiresAt,
  });

  res.json({
    tokenAddress: order.tokenAddress,
    amountWei,
    deadlineSeconds: 15 * 60,
    expiresAt: quoteExpiresAt,
  });
});

/**
 * POST /api/orders/:orderId/confirm
 *
 * Call this after the on-chain `pay()` transaction confirms. Verifies
 * the transaction actually matches the quote before marking the order
 * paid — don't trust the frontend's word for it.
 */
router.post("/api/orders/:orderId/confirm", async (req, res) => {
  const { orderId } = req.params;
  const { txHash } = req.body;

  const quote = await getCheckoutQuote(orderId);
  if (!quote) return res.status(400).json({ error: "No active quote" });

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    return res.status(400).json({ error: "Transaction not confirmed" });
  }

  // Decode the Transfer/PaymentReceived event and check token + amount
  // + receiver match the quote exactly before marking paid.
  const matches = await verifyPaymentMatchesQuote(receipt, quote);
  if (!matches) {
    return res.status(400).json({ error: "Payment does not match order" });
  }

  await markOrderPaid(orderId, txHash);
  res.json({ status: "paid" });
});

// --- 2. Nonce bitmap lookup -------------------------------------------

/**
 * Permit2 nonces are tracked as bits within 256-bit words, per owner.
 * wordPos selects which 256-bit word; bitPos (0-255) selects the bit
 * within it. A nonce is unused if its bit is 0.
 *
 * For most checkout volumes, picking a random wordPos/bitPos and
 * checking it's unused is simpler and sufficiently collision-free than
 * scanning sequentially. Retry on collision (rare).
 */
async function getFreshPermit2Nonce(ownerAddress) {
  const maxAttempts = 5;

  for (let i = 0; i < maxAttempts; i++) {
    const wordPos = BigInt(Math.floor(Math.random() * 2 ** 32));
    const bitPos = Math.floor(Math.random() * 256);

    const bitmap = await permit2.nonceBitmap(ownerAddress, wordPos);
    const bit = (BigInt(bitmap) >> BigInt(bitPos)) & 1n;

    if (bit === 0n) {
      // Permit2 nonce = wordPos * 256 + bitPos
      return (wordPos * 256n + BigInt(bitPos)).toString();
    }
  }

  throw new Error("Could not find unused nonce after retries");
}

router.get("/api/checkout/nonce/:ownerAddress", async (req, res) => {
  try {
    const nonce = await getFreshPermit2Nonce(req.params.ownerAddress);
    res.json({ nonce });
  } catch (err) {
    res.status(500).json({ error: "Failed to allocate nonce" });
  }
});

// --- 3. On-chain verification -------------------------------------------

/**
 * Decodes the PaymentReceived event from a confirmed transaction receipt
 * and checks it matches the quote we issued: same contract, same token,
 * same amount. This is what makes /confirm trustworthy — the backend
 * verifies the chain state itself rather than believing the frontend.
 */
async function verifyPaymentMatchesQuote(receipt, quote) {
  if (receipt.to?.toLowerCase() !== CHECKOUT_CONTRACT_ADDRESS.toLowerCase()) {
    return false; // transaction wasn't even sent to our checkout contract
  }

  const paymentLog = receipt.logs
    .filter((log) => log.address.toLowerCase() === CHECKOUT_CONTRACT_ADDRESS.toLowerCase())
    .map((log) => {
      try {
        return checkoutInterface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((parsed) => parsed?.name === "PaymentReceived");

  if (!paymentLog) return false;

  const { token, amount } = paymentLog.args;

  const tokenMatches = token.toLowerCase() === quote.tokenAddress.toLowerCase();
  const amountMatches = amount.toString() === quote.amountWei.toString();
  const notExpired = Math.floor(Date.now() / 1000) <= quote.expiresAt;

  return tokenMatches && amountMatches && notExpired;
}

module.exports = router;

// --- Stubs — replace with your real data layer --------------------------
// async function getOrderById(orderId) {}
// async function saveCheckoutQuote(orderId, quote) {}
// async function getCheckoutQuote(orderId) {}
// async function markOrderPaid(orderId, txHash) {}
