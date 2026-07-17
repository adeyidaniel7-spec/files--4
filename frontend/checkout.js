/**
 * Checkout page logic. Pairs with index.html and CheckoutPermit2.sol.
 *
 * Flow:
 *   1. Customer clicks "Connect Wallet" -> their wallet (MetaMask, etc.)
 *      connects, showing their own address.
 *   2. Page fetches the REAL order amount from YOUR backend (never
 *      trusted from the page itself) and displays it.
 *   3. Customer clicks "Pay" -> their wallet prompts them to sign the
 *      Permit2 message (showing the real amount, no gas).
 *   4. Their wallet immediately prompts again to confirm the actual
 *      pay() transaction (showing gas fee) -> they approve -> funds move.
 *   5. Page tells your backend the tx hash so it can verify + mark paid.
 *
 * Replace the CONFIG values below with your real deployed addresses.
 */

const CONFIG = {
  // From your deploy.js output
  CHECKOUT_CONTRACT_ADDRESS: "0xYourDeployedCheckoutPermit2Address",
  // Real Permit2 — same on every chain
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  // Your order-quote backend endpoint, e.g. checkoutBackend.js
  BACKEND_URL: "https://your-backend.example.com",
  ORDER_ID: "ORDER_PLACEHOLDER", // pull from the URL/page context in production
  CHAIN_ID: 11155111, // Sepolia while testing; 1 for mainnet
  TOKEN_SYMBOL: "USDC",
  ITEM_NAME: "Order item",
};

const CHECKOUT_ABI = [
  "function pay(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external",
];

const PERMIT2_ABI = [
  "function nonceBitmap(address owner, uint256 wordPos) view returns (uint256)",
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

let provider, signer, userAddress;
let quote = null; // { tokenAddress, amountWei, deadlineSeconds }

const el = {
  itemName: document.getElementById("item-name"),
  tokenSymbol: document.getElementById("token-symbol"),
  totalAmount: document.getElementById("total-amount"),
  actionBtn: document.getElementById("action-btn"),
  status: document.getElementById("status"),
  stepLabel: document.getElementById("step-label"),
  steps: [
    document.getElementById("step-1"),
    document.getElementById("step-2"),
    document.getElementById("step-3"),
  ],
};

el.itemName.textContent = CONFIG.ITEM_NAME;
el.tokenSymbol.textContent = CONFIG.TOKEN_SYMBOL;

function setStatus(message, kind) {
  el.status.textContent = message;
  el.status.className = `status show ${kind}`;
}

function clearStatus() {
  el.status.className = "status";
}

function setStep(n, label) {
  el.steps.forEach((s, i) => {
    s.className = "step" + (i < n - 1 ? " done" : i === n - 1 ? " active" : "");
  });
  el.stepLabel.textContent = label;
}

async function fetchQuote() {
  const res = await fetch(`${CONFIG.BACKEND_URL}/api/orders/${CONFIG.ORDER_ID}/checkout-quote`);
  if (!res.ok) throw new Error("Could not load order total. Refresh and try again.");
  const data = await res.json();
  quote = data;
  el.totalAmount.textContent = `${ethers.utils.formatUnits(data.amountWei, 6)} ${CONFIG.TOKEN_SYMBOL}`;
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("No wallet found. Install MetaMask or another Ethereum wallet to pay.", "error");
    return;
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    const network = await provider.getNetwork();
    if (network.chainId !== CONFIG.CHAIN_ID) {
      setStatus(`Please switch your wallet to the correct network (chain ID ${CONFIG.CHAIN_ID}) and reconnect.`, "error");
      return;
    }

    await fetchQuote();

    el.actionBtn.textContent = "Pay";
    el.actionBtn.onclick = payNow;
    setStep(2, `Step 2 of 3 — Confirm ${el.totalAmount.textContent}`);
    clearStatus();
  } catch (err) {
    setStatus(err.message || "Could not connect wallet.", "error");
  }
}

async function ensureAllowance() {
  const token = new ethers.Contract(quote.tokenAddress, ERC20_ABI, signer);
  const current = await token.allowance(userAddress, CONFIG.PERMIT2_ADDRESS);

  // One-time approval per token, so Permit2 is allowed to move funds
  // when a valid signature is later presented. This does NOT move any
  // funds itself — it only permits Permit2 to act on future signed
  // instructions, same as approving any other spender.
  if (current.lt(quote.amountWei)) {
    setStatus("Approving token for Permit2 (one-time per token)...", "info");
    const tx = await token.approve(CONFIG.PERMIT2_ADDRESS, ethers.constants.MaxUint256);
    await tx.wait();
  }
}

function getFreshNonce() {
  const bytes = ethers.utils.randomBytes(32);
  return ethers.BigNumber.from(bytes);
}

async function payNow() {
  el.actionBtn.disabled = true;

  try {
    await ensureAllowance();

    const nonce = getFreshNonce();
    const deadline = Math.floor(Date.now() / 1000) + (quote.deadlineSeconds || 900);

    const domain = {
      name: "Permit2",
      chainId: CONFIG.CHAIN_ID,
      verifyingContract: CONFIG.PERMIT2_ADDRESS,
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

    const message = {
      permitted: { token: quote.tokenAddress, amount: quote.amountWei },
      spender: CONFIG.CHECKOUT_CONTRACT_ADDRESS,
      nonce,
      deadline,
    };

    setStatus("Check your wallet — sign the payment authorization.", "info");
    const signature = await signer._signTypedData(domain, types, message);

    setStep(3, "Step 3 of 3 — Confirm the transaction");
    setStatus("Check your wallet — confirm the transaction to complete payment.", "info");

    const checkout = new ethers.Contract(CONFIG.CHECKOUT_CONTRACT_ADDRESS, CHECKOUT_ABI, signer);
    const tx = await checkout.pay(quote.tokenAddress, quote.amountWei, nonce, deadline, signature);

    setStatus("Transaction submitted. Waiting for confirmation...", "info");
    const receipt = await tx.wait();

    await notifyBackend(receipt.transactionHash);

    setStep(3, "Payment complete");
    setStatus(
      `Payment confirmed. Transaction: ${receipt.transactionHash.slice(0, 10)}...`,
      "success"
    );
    el.actionBtn.textContent = "Paid";
  } catch (err) {
    el.actionBtn.disabled = false;
    if (err.code === "ACTION_REJECTED" || err.code === 4001) {
      setStatus("Payment was cancelled in your wallet.", "error");
    } else {
      setStatus(err.reason || err.message || "Payment failed. Please try again.", "error");
    }
  }
}

async function notifyBackend(txHash) {
  await fetch(`${CONFIG.BACKEND_URL}/api/orders/${CONFIG.ORDER_ID}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash }),
  });
}

setStep(1, "Step 1 of 3 — Connect your wallet");
el.actionBtn.onclick = connectWallet;
