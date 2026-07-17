/**
 * Frontend signing helper for CheckoutPermit2.sol
 *
 * This pairs with the on-chain `pay()` function. The customer's wallet
 * signs this EIP-712 message, then the SAME wallet immediately submits
 * the `pay()` transaction themselves — so whatever amount/deadline is
 * shown here is exactly what they see and approve, twice, in real time.
 *
 * Requires ethers.js v5 (signer._signTypedData) — swap for v6's
 * signer.signTypedData(...) if that's what you're using.
 */

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3"; // same on every chain
const CHECKOUT_CONTRACT_ADDRESS = "0xYourDeployedCheckoutPermit2Address";

const domain = {
  name: "Permit2",
  chainId: 1, // set dynamically from provider.getNetwork() in production
  verifyingContract: PERMIT2_ADDRESS,
};

const types = {
  PermitTransferFrom: [
    { name: "permitted", type: "TokenPermissions" },
    { name: "spender", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  TokenPermissions: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint256" },
  ],
};

/**
 * @param signer            ethers Signer for the connected customer wallet
 * @param tokenAddress      ERC20 token the customer is paying with
 * @param orderAmountWei    The REAL order total, in the token's smallest unit
 *                          (e.g. computed server-side from the cart, then
 *                          passed in — never hardcoded, never inflated)
 * @param nonce             See getFreshNonce() below
 * @param deadlineSeconds   How long the signature stays valid, in seconds
 *                          from now. Keep this short — payment windows,
 *                          not indefinite authorizations.
 */
async function signCheckoutPermit(
  signer,
  tokenAddress,
  orderAmountWei,
  nonce,
  deadlineSeconds = 15 * 60 // 15 minutes, not 260 years
) {
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;

  const message = {
    permitted: {
      token: tokenAddress,
      amount: orderAmountWei, // exact order total — this is what the wallet displays
    },
    spender: CHECKOUT_CONTRACT_ADDRESS, // must match the contract that will redeem it
    nonce,
    deadline,
  };

  const signature = await signer._signTypedData(domain, types, message);

  return { signature, message, deadline };
}

/**
 * Permit2 uses a bitmap nonce scheme, not a simple incrementing counter.
 * Pick any unused uint256 per signature — simplest safe approach for
 * low/medium volume checkouts is a random 256-bit value; for high volume,
 * query Permit2's nonceBitmap(owner, wordPos) to find an unused bit.
 */
function getFreshNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return BigInt(
    "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Full checkout flow: sign, then immediately submit the payment
 * transaction from the SAME wallet. Two prompts, back to back, both
 * showing the real order amount to the customer.
 */
async function checkout(signer, checkoutContract, tokenAddress, orderAmountWei) {
  const nonce = getFreshNonce();

  // Prompt 1: off-chain signature, no gas, shows real amount + deadline
  const { signature, deadline } = await signCheckoutPermit(
    signer,
    tokenAddress,
    orderAmountWei,
    nonce
  );

  // Prompt 2: on-chain transaction, customer pays gas, wallet shows
  // "interacting with CheckoutPermit2, function pay" + gas estimate
  const tx = await checkoutContract
    .connect(signer)
    .pay(tokenAddress, orderAmountWei, nonce, deadline, signature);

  return tx.wait();
}

export { signCheckoutPermit, getFreshNonce, checkout };
