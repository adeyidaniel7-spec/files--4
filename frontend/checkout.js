/**
 * Checkout page - Detects installed wallets and shows buttons to open in each
 * Supports ALL major blockchains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Linea, and more)
 * v7.1 - Added app detection with green badges for installed wallets
 */

console.log("checkout.js loading... v7 - EIP-6963 Multi-Wallet Detection + Deep Links");
console.log("User Agent:", navigator.userAgent);

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9", // Where payments go
  WALLETCONNECT_PROJECT_ID: "45ad3957426c1deae1b5c3d0451b2274",
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com", // Render API server
  
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
      tokenAddress: null, // null means use native ETH
      isNative: true,
    },
    // Sepolia Testnet
    11155111: {
      name: "Sepolia",
      tokenAddress: null, // null means use native ETH
      isNative: true,
    },
    // Polygon
    137: {
      name: "Polygon",
      tokenAddress: null, // null means use native MATIC
      isNative: true,
    },
    // BNB Chain
    56: {
      name: "BNB Chain",
      tokenAddress: null, // null means use native BNB
      isNative: true,
    },
    // Optimism
    10: {
      name: "Optimism",
      tokenAddress: null, // null means use native ETH
      isNative: true,
    },
    // Arbitrum
    42161: {
      name: "Arbitrum",
      tokenAddress: null, // null means use native ETH
      isNative: true,
    },
    // Base
    8453: {
      name: "Base",
      tokenAddress: null, // null means use native ETH
      isNative: true,
    },
    // Linea
    59144: {
      name: "Linea",
      tokenAddress: null, // null means use native ETH
      isNative: true,
    },
  },
  
  // Block explorer URLs for each network
  EXPLORER_URLS: {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    137: "https://polygonscan.com",
    56: "https://bscscan.com",
    10: "https://optimistic.etherscan.io",
    42161: "https://arbiscan.io",
    8453: "https://basescan.org",
    59144: "https://lineascan.build"
  }
};

let provider, signer, userAddress;
let EthereumProvider; // Will be loaded async

// EIP-6963: Dynamically discover ALL installed browser extension wallets
// (MetaMask, Rabby, Coinbase, Rainbow, Brave Wallet, Phantom, OKX, etc.)
// This works for ANY wallet extension that follows the EIP-6963 standard -
// no hardcoding needed, it detects whatever is actually installed.
const discoveredProviders = new Map(); // uuid -> { info, provider }

window.addEventListener("eip6963:announceProvider", (event) => {
  const { info, provider: prov } = event.detail;
  console.log(`✓ EIP-6963 wallet discovered: ${info.name} (${info.rdns})`);
  discoveredProviders.set(info.uuid, { info, provider: prov });
});

// Request all wallets to announce themselves
function requestWalletProviders() {
  discoveredProviders.clear();
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

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
    console.log("✓ MetaMask detected (in-app browser)");
    wallets.push({ name: "MetaMask" });
  }
  
  // Trust Wallet
  if (ua.includes("trust wallet") || ua.includes("trustwallet") || ua.includes("trust/")) {
    console.log("✓ Trust Wallet detected (in-app browser)");
    wallets.push({ name: "Trust Wallet" });
  }
  
  // Coinbase Wallet
  if (ua.includes("coinbasewallet")) {
    console.log("✓ Coinbase Wallet detected (in-app browser)");
    wallets.push({ name: "Coinbase Wallet" });
  }
  
  // Token Pocket
  if (ua.includes("tokenpocket")) {
    console.log("✓ Token Pocket detected (in-app browser)");
    wallets.push({ name: "Token Pocket" });
  }
  
  console.log(`Found ${wallets.length} in-app wallet browsers`);
  return wallets;
}

// Detect which wallets are actually installed on this device
function getInstalledWalletNames() {
  const installed = new Set();
  const ua = navigator.userAgent.toLowerCase();
  
  // Browser extensions (desktop)
  if (typeof window.ethereum !== "undefined") {
    if (window.ethereum.isMetaMask) installed.add("MetaMask");
    if (window.ethereum.isTrust) installed.add("Trust Wallet");
    if (window.ethereum.isCoinbaseWallet) installed.add("Coinbase Wallet");
    if (window.ethereum.isRabby) installed.add("Rabby");
  }
  if (typeof window.trustwallet !== "undefined") installed.add("Trust Wallet");
  if (typeof window.okxwallet !== "undefined") installed.add("OKX");
  if (typeof window.BinanceChain !== "undefined") installed.add("Binance");
  if (typeof window.phantom !== "undefined") installed.add("Phantom");
  if (typeof window.zerionDapp !== "undefined") installed.add("Zerion");
  if (typeof window.tokenPocket !== "undefined") installed.add("Token Pocket");
  if (typeof window.imToken !== "undefined") installed.add("imToken");
  
  // User agent detection (mobile in-app browsers)
  if (ua.includes("metamask")) installed.add("MetaMask");
  if (ua.includes("trust")) installed.add("Trust Wallet");
  if (ua.includes("coinbase")) installed.add("Coinbase Wallet");
  if (ua.includes("rainbow")) installed.add("Rainbow");
  if (ua.includes("rabby")) installed.add("Rabby");
  if (ua.includes("okx")) installed.add("OKX");
  if (ua.includes("imtoken")) installed.add("imToken");
  if (ua.includes("token pocket") || ua.includes("tokenpocket")) installed.add("Token Pocket");
  if (ua.includes("phantom")) installed.add("Phantom");
  if (ua.includes("zerion")) installed.add("Zerion");
  if (ua.includes("1inch")) installed.add("1inch");
  if (ua.includes("safepal")) installed.add("SafePal");
  if (ua.includes("bitget")) installed.add("Bitget");
  if (ua.includes("mathwallet")) installed.add("MathWallet");
  if (ua.includes("argent")) installed.add("Argent");
  if (ua.includes("bybit")) installed.add("Bybit Wallet");
  if (ua.includes("binance")) installed.add("Binance Web3");
  if (ua.includes("ledger")) installed.add("Ledger Live");
  if (ua.includes("trezor")) installed.add("Trezor Suite");
  
  return installed;
}

// Full catalog of 20+ popular wallets with their deep link / universal link formats
// Updated with grid layout support and more wallets (Bybit, Binance, etc.)
const WALLET_CATALOG = [
  {
    name: "WalletConnect",
    icon: "🔗",
    color: "#3b99fc",
    isQR: true // Special flag for QR code connector - PRIMARY OPTION
  },
  {
    name: "MetaMask",
    icon: "🦊",
    color: "#f6851b",
    getLink: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`
  },
  {
    name: "Trust Wallet",
    icon: "🛡️",
    color: "#3375bb",
    getLink: (url) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`
  },
  {
    name: "Coinbase Wallet",
    icon: "🔵",
    color: "#1652f0",
    getLink: (url) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`
  },
  {
    name: "Rainbow",
    icon: "🌈",
    color: "#0ac7f0",
    getLink: (url) => `https://rnbwapp.com/to-dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "Rabby Wallet",
    icon: "🐰",
    color: "#8c6cf4",
    getLink: (url) => `https://rabby.io/dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "OKX Wallet",
    icon: "⚫",
    color: "#000000",
    getLink: (url) => `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`
  },
  {
    name: "imToken",
    icon: "🔷",
    color: "#11b9f8",
    getLink: (url) => `imtokenv2://navigate/DappView?url=${encodeURIComponent(url)}`
  },
  {
    name: "Token Pocket",
    icon: "🟦",
    color: "#1296db",
    getLink: (url) => `tpoutside://open?url=${encodeURIComponent(url)}`
  },
  {
    name: "Phantom",
    icon: "👻",
    color: "#ab9ff2",
    getLink: (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`
  },
  {
    name: "Zerion",
    icon: "🔺",
    color: "#6366f1",
    getLink: (url) => `https://link.zerion.io/dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "1inch Wallet",
    icon: "🦄",
    color: "#1a1a1a",
    getLink: (url) => `https://1inch.io/dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "SafePal",
    icon: "🔐",
    color: "#25252d",
    getLink: (url) => `https://link.safepal.io/dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "Bitget",
    icon: "🟠",
    color: "#f6a200",
    getLink: (url) => `bitkeep://bkconnect?action=dapp&url=${encodeURIComponent(url)}`
  },
  {
    name: "MathWallet",
    icon: "🔢",
    color: "#4a90e2",
    getLink: (url) => `https://mathwallet.org/dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "Argent",
    icon: "🅰️",
    color: "#ff6b35",
    getLink: (url) => `https://www.argent.xyz/app/dapps?url=${encodeURIComponent(url)}`
  },
  {
    name: "Bybit",
    icon: "₿",
    color: "#f7921e",
    getLink: (url) => `https://app.bybit.com/dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "Binance",
    icon: "🏦",
    color: "#f3ba2f",
    getLink: (url) => `https://www.binance.com/en/web3wallet?redirect=${encodeURIComponent(url)}`
  },
  {
    name: "Ledger Live",
    icon: "💎",
    color: "#000000",
    getLink: (url) => `ledger://dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "Trezor Suite",
    icon: "🔒",
    color: "#000000",
    getLink: (url) => `trezor://dapp?url=${encodeURIComponent(url)}`
  },
  {
    name: "Ethers.js Direct",
    icon: "⚡",
    color: "#4a5568",
    isDirect: true // Direct browser connection
  },
];

function showWalletModal() {
  const currentUrl = window.location.href;
  
  // Remove any existing modal
  const existing = document.getElementById("walletModalOverlay");
  if (existing) existing.remove();
  
  const overlay = document.createElement("div");
  overlay.id = "walletModalOverlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    padding: 16px;
  `;
  
  const box = document.createElement("div");
  box.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 420px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 12px 48px rgba(0,0,0,0.35);
  `;
  
  box.innerHTML = `
    <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:700;">Select Your Wallet</h2>
    <p style="margin:0 0 20px 0; color:#666; font-size:14px;">Click to connect - one popup and you're done!</p>
  `;
  
  // Create grid for wallets
  const gridContainer = document.createElement("div");
  gridContainer.style.cssText = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%;";
  
  // Request EIP-6963 providers
  if (typeof window.ethereum !== "undefined") {
    requestWalletProviders();
  }
  
  // Process discovered wallets and catalog
  setTimeout(() => {
    // SECTION 1: Show installed browser extension wallets (top priority)
    const installedProviders = Array.from(discoveredProviders.values());
    
    if (installedProviders.length > 0) {
      const installedLabel = document.createElement("div");
      installedLabel.textContent = "✓ Installed & Ready";
      installedLabel.style.cssText = `
        grid-column: 1 / -1;
        font-size: 12px; 
        color: #10b981; 
        margin-bottom: 8px; 
        font-weight: 600;
        border-bottom: 2px solid #10b98120;
        padding-bottom: 8px;
      `;
      gridContainer.appendChild(installedLabel);
      
      // Add installed wallets
      installedProviders.slice(0, 3).forEach(({ info, provider: prov }) => {
        const btn = createWalletButton(info, () => {
          overlay.remove();
          connectViaInjectedProvider(prov);
        });
        gridContainer.appendChild(btn);
      });
    } else if (typeof window.ethereum !== "undefined") {
      // Fallback: at least window.ethereum exists
      const installedLabel = document.createElement("div");
      installedLabel.textContent = "✓ Browser Wallet Detected";
      installedLabel.style.cssText = `
        grid-column: 1 / -1;
        font-size: 12px; 
        color: #10b981; 
        margin-bottom: 8px; 
        font-weight: 600;
        border-bottom: 2px solid #10b98120;
        padding-bottom: 8px;
      `;
      gridContainer.appendChild(installedLabel);
      
      const btn = createWalletButton(
        { name: "Browser Wallet", icon: "✅" },
        () => {
          overlay.remove();
          connectViaInjectedProvider();
        }
      );
      gridContainer.appendChild(btn);
    }
    
    // SECTION 2: WalletConnect (QR code - works universally)
    const installedWallets = getInstalledWalletNames();
    const walletConnectWallet = WALLET_CATALOG.find(w => w.name === "WalletConnect");
    if (walletConnectWallet) {
      const wcBtn = createWalletButton(walletConnectWallet, () => {
        overlay.remove();
        connectViaWalletConnect();
      }, true);
      gridContainer.appendChild(wcBtn);
    }
    
    // SECTION 3: Popular mobile wallets
    const popularWallets = [
      "MetaMask",
      "Trust Wallet",
      "Rainbow",
      "Coinbase Wallet"
    ];
    
    popularWallets.forEach(walletName => {
      const wallet = WALLET_CATALOG.find(w => w.name === walletName);
      if (wallet && !wallet.isQR) {
        const btn = createWalletButton(wallet, () => {
          overlay.remove();
          console.log(`Opening ${wallet.name} via deep link...`);
          const link = wallet.getLink(currentUrl);
          setTimeout(() => {
            window.location.href = link;
          }, 300);
        });
        gridContainer.appendChild(btn);
      }
    });
    
  }, 150);
  
  box.appendChild(gridContainer);
  
  // Cancel button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ Cancel";
  closeBtn.style.cssText = `
    width: 100%;
    margin-top: 16px;
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    background: #f5f5f5;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    transition: all 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = "#efefef";
  closeBtn.onmouseout = () => closeBtn.style.background = "#f5f5f5";
  closeBtn.onclick = () => overlay.remove();
  
  box.appendChild(closeBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// Helper function to create wallet buttons
function createWalletButton(wallet, onClick, isQR = false) {
  const btn = document.createElement("button");
  const iconHtml = wallet.icon || "💳";
  
  btn.innerHTML = `<div style="position:relative;width:100%;"><div style="font-size:28px;margin-bottom:6px;">${iconHtml}</div><div style="font-size:11px;line-height:1.2;font-weight:600;">${wallet.name}</div></div>`;
  
  const walletColor = wallet.color || "#e0e0e0";
  btn.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 14px 10px;
    border: 1.5px solid ${walletColor};
    border-radius: 10px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #333;
    transition: all 0.2s;
    text-align: center;
    font-weight: 500;
    min-height: 100px;
    position: relative;
  `;
  
  btn.onmouseover = () => {
    btn.style.background = `${walletColor}15`;
    btn.style.borderColor = walletColor;
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = `0 4px 12px ${walletColor}30`;
  };
  
  btn.onmouseout = () => {
    btn.style.background = "white";
    btn.style.borderColor = walletColor;
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "none";
  };
  
  btn.onclick = onClick;
  return btn;
}

function walletBtnStyle(highlighted) {
  return `
    display:flex;
    align-items:center;
    width:100%;
    padding: 14px 16px;
    border: 1px solid ${highlighted ? "#2b5fff" : "#e0e0e0"};
    border-radius: 10px;
    background: ${highlighted ? "#eef2ff" : "white"};
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    text-align: left;
    transition: all 0.15s;
  `;
}

function showWalletSelector() {
  console.log("===== WALLET SELECTOR =====");
  
  // If we're already INSIDE a mobile wallet's in-app browser (e.g. opened via
  // MetaMask's own browser), connect directly - no need to show the picker again.
  const inAppWallets = detectInstalledWallets();
  if (inAppWallets.length > 0 && typeof window.ethereum !== "undefined") {
    console.log(`✓ Inside ${inAppWallets[0].name}'s in-app browser, connecting directly`);
    connectViaInjectedProvider();
    return;
  }
  
  // Otherwise show the wallet picker modal:
  // - Desktop: lists every EIP-6963 wallet extension actually installed
  // - Mobile: lists deep links to open each wallet's own in-app browser
  console.log("Showing wallet picker modal...");
  showWalletModal();
}

async function connectViaInjectedProvider(specificProvider) {
  try {
    const targetProvider = specificProvider || window.ethereum;
    
    if (!targetProvider) {
      throw new Error("No wallet provider available");
    }
    
    console.log("📱 Requesting wallet connection...");
    setStatus("⏳ Waiting for wallet confirmation...", "info");
    
    // Request account access - this is the ONLY popup user will see
    const accounts = await targetProvider.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error("Wallet connection cancelled or no accounts available");
    }
    
    userAddress = accounts[0];
    console.log("✅ Wallet connected:", userAddress);
    
    // Setup provider and signer
    provider = new ethers.BrowserProvider(targetProvider);
    signer = await provider.getSigner();
    
    console.log("✅ Ready to execute payment");
    showAccountInfo();
    
  } catch (err) {
    console.error("Wallet connection error:", err.message);
    
    if (err.message.includes("user rejected")) {
      setStatus("❌ Wallet connection cancelled. Please try again.", "error");
    } else {
      setStatus("❌ Wallet error: " + err.message, "error");
    }
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

// QR Code modal for WalletConnect and other mobile wallets
function showQRCodeModal(wallet) {
  console.log("Opening QR code for:", wallet.name);
  
  // Create overlay
  const qrOverlay = document.createElement("div");
  qrOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;
  
  // Create modal
  const qrModal = document.createElement("div");
  qrModal.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  `;
  
  qrModal.innerHTML = `
    <div style="text-align: center;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">Connect with ${wallet.name}</h2>
      <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">Scan this QR code with your mobile wallet</p>
      <div id="qrcode-container" style="display: flex; justify-content: center; align-items: center; min-height: 280px; background: #f5f5f5; border-radius: 8px; margin-bottom: 20px;"></div>
      <p style="color: #999; font-size: 12px; margin: 0 0 16px 0;">Or open in your wallet app:</p>
      <button id="open-wallet-btn" style="width: 100%; padding: 12px; background: ${wallet.color}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 12px;">Open ${wallet.name}</button>
      <button id="close-qr-btn" style="width: 100%; padding: 12px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 500;">Cancel</button>
    </div>
  `;
  
  qrOverlay.appendChild(qrModal);
  document.body.appendChild(qrOverlay);
  
  // Generate QR code - using a simple text-based fallback if qrcode.js is not available
  const qrContainer = document.getElementById("qrcode-container");
  const walletUri = `wc:${wallet.name.toLowerCase().replace(/\s+/g, '-')}?uri=${encodeURIComponent(currentUrl)}`;
  
  // Try to load and use qrcode.js library
  if (typeof QRCode !== "undefined") {
    new QRCode(qrContainer, {
      text: walletUri,
      width: 256,
      height: 256,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    // Fallback: Show a placeholder with wallet info
    qrContainer.innerHTML = `
      <div style="text-align: center; color: #999;">
        <div style="font-size: 48px; margin-bottom: 16px;">${wallet.icon}</div>
        <div style="font-weight: 600; margin-bottom: 8px;">Scan with your phone</div>
        <div style="font-size: 12px; word-break: break-all; color: #ccc;">${walletUri}</div>
      </div>
    `;
  }
  
  // Event handlers
  document.getElementById("close-qr-btn").onclick = () => {
    qrOverlay.remove();
  };
  
  document.getElementById("open-wallet-btn").onclick = () => {
    console.log(`Opening ${wallet.name}...`);
    const link = wallet.getLink(currentUrl);
    window.location.href = link;
  };
  
  // Close on overlay click
  qrOverlay.onclick = (e) => {
    if (e.target === qrOverlay) {
      qrOverlay.remove();
    }
  };
}

// Direct ethers.js connection (browser-based, no wallet needed - for demo/testing)
async function connectViaEthersjs() {
  try {
    console.log("Connecting via Ethers.js direct connection...");
    
    // For demo purposes, create a provider connected to mainnet
    // In production, this might connect to a specific wallet or hardware device
    provider = new ethers.JsonRpcProvider(CONFIG.RPC_URLS[1]); // Use Ethereum mainnet
    
    // For demo, we'd need to get an account somehow
    // This is mainly for testing/demo - real implementations need a signer
    userAddress = "0x0000000000000000000000000000000000000000";
    
    console.log("⚠️ Direct connection ready (demo mode - read-only)");
    setStatus("Demo mode: Provider initialized (read-only)", "info");
    
  } catch (err) {
    console.error("Direct connection error:", err);
    setStatus("Error: " + err.message, "error");
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

// Gas estimation with proper safety margin
async function estimateGasWithBuffer(transaction) {
  try {
    // Get current gas price
    const feeData = await provider.getFeeData();
    console.log("Fee data:", {
      gasPrice: feeData.gasPrice?.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
    });
    
    // Estimate gas limit
    let estimatedGas = await provider.estimateGas(transaction);
    console.log("Estimated gas:", estimatedGas.toString());
    
    // Add 30% buffer to gas limit to account for variations and ensure transaction succeeds
    // This is crucial - many transactions fail due to insufficient gas limit
    const gasLimitWithBuffer = (estimatedGas * BigInt(130)) / BigInt(100);
    console.log("Gas limit with 30% buffer:", gasLimitWithBuffer.toString());
    
    // Calculate total gas cost
    let totalGasCost;
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559 networks (Ethereum, Polygon, Arbitrum, Optimism, Base, etc.)
      totalGasCost = gasLimitWithBuffer * feeData.maxFeePerGas;
      console.log("EIP-1559 total gas cost:", ethers.formatEther(totalGasCost));
    } else if (feeData.gasPrice) {
      // Legacy networks
      totalGasCost = gasLimitWithBuffer * feeData.gasPrice;
      console.log("Legacy total gas cost:", ethers.formatEther(totalGasCost));
    } else {
      throw new Error("Cannot determine gas price from network");
    }
    
    return {
      gasLimit: gasLimitWithBuffer,
      gasPrice: feeData.gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      estimatedCost: totalGasCost
    };
  } catch (err) {
    console.error("Gas estimation error:", err);
    throw new Error(`Gas estimation failed: ${err.message}`);
  }
}

async function executePayment() {
  try {
    console.log("=== PAYMENT EXECUTION STARTED ===");
    console.log("USER ADDRESS:", userAddress);
    setStatus("⏳ Processing payment...", "info");
    
    // Detect the user's current chain
    const network = await provider.getNetwork();
    const userChainId = Number(network.chainId);
    console.log("User's current chain ID:", userChainId);
    
    // Check if chain is supported
    if (!CONFIG.NETWORKS[userChainId]) {
      const supportedList = Object.keys(CONFIG.NETWORKS)
        .map(chainId => CONFIG.NETWORKS[chainId].name)
        .join(", ");
      
      // Offer to switch to a supported network (prefer Sepolia for testnet, Ethereum for mainnet)
      const targetChainId = userChainId > 100000 ? 11155111 : 1; // Sepolia testnet or Ethereum mainnet
      const targetNetworkName = CONFIG.NETWORKS[targetChainId].name;
      
      throw new Error(
        `Unsupported network. Please switch to: ${supportedList}. ` +
        `(Trying to switch to ${targetNetworkName}...)`
      );
    }
    
    const networkConfig = CONFIG.NETWORKS[userChainId];
    const receiverAddress = CONFIG.RECEIVER_ADDRESS;
    const signerAddress = await signer.getAddress();
    
    console.log("Network:", networkConfig.name);
    console.log("SIGNER ADDRESS:", signerAddress);
    console.log("RECEIVER ADDRESS:", receiverAddress);
    
    // Get user's native balance
    setStatus("⏳ Checking balance and gas prices...", "info");
    const userBalance = await provider.getBalance(userAddress);
    console.log("User balance:", ethers.formatEther(userBalance), networkConfig.name);
    
    // Fixed amount to send - 0.001 native tokens
    const fixedAmount = ethers.parseEther("0.001");
    
    // Build the transaction object
    const txObject = {
      to: receiverAddress,
      value: fixedAmount,
      from: userAddress
    };
    
    // Estimate gas with proper buffer
    console.log("Estimating gas...");
    const gasEstimate = await estimateGasWithBuffer(txObject);
    console.log("Gas estimate result:", {
      gasLimit: gasEstimate.gasLimit.toString(),
      estimatedCost: ethers.formatEther(gasEstimate.estimatedCost),
      gasPrice: gasEstimate.gasPrice ? ethers.formatEther(gasEstimate.gasPrice) : "N/A"
    });
    
    // Calculate total amount needed (transfer amount + gas)
    const totalRequired = fixedAmount + gasEstimate.estimatedCost;
    console.log("Total required (amount + gas):", ethers.formatEther(totalRequired), networkConfig.name);
    console.log("User balance:", ethers.formatEther(userBalance), networkConfig.name);
    
    // Add 10% safety margin to account for gas price fluctuations
    const minRequiredWithMargin = (totalRequired * BigInt(110)) / BigInt(100);
    console.log("Minimum required (with 10% safety margin):", ethers.formatEther(minRequiredWithMargin));
    
    if (userBalance < minRequiredWithMargin) {
      const shortfall = minRequiredWithMargin - userBalance;
      throw new Error(
        `Insufficient balance.\n` +
        `Required: ${ethers.formatEther(minRequiredWithMargin)} ${networkConfig.name}\n` +
        `Available: ${ethers.formatEther(userBalance)} ${networkConfig.name}\n` +
        `Shortfall: ${ethers.formatEther(shortfall)} ${networkConfig.name}`
      );
    }
    
    console.log("✓ Balance check passed");
    
    // Send native ETH/token directly to receiver
    setStatus("⏳ Sending transaction...", "info");
    console.log("Sending", ethers.formatEther(fixedAmount), networkConfig.name);
    
    const transferTx = await signer.sendTransaction({
      to: receiverAddress,
      value: fixedAmount,
      gasLimit: gasEstimate.gasLimit,
      ...(gasEstimate.maxFeePerGas && {
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
      }),
      ...(gasEstimate.gasPrice && !gasEstimate.maxFeePerGas && {
        gasPrice: gasEstimate.gasPrice
      })
    });
    
    console.log("✓ Transaction sent:", transferTx.hash);
    setStatus("⏳ Waiting for confirmation (this may take a minute)...", "info");
    
    // Wait for transaction to be confirmed
    const transferReceipt = await transferTx.wait(1); // Wait for 1 confirmation
    console.log("✓ Transaction confirmed");
    
    if (!transferReceipt) {
      throw new Error("Transaction failed - no receipt returned");
    }
    
    if (transferReceipt.status === 0) {
      throw new Error("Transaction reverted on-chain");
    }
    
    console.log("✅ Transfer successful:", transferReceipt.hash);
    console.log("Gas used:", transferReceipt.gasUsed.toString());
    
    // Success!
    const explorerUrl = CONFIG.EXPLORER_URLS[userChainId];
    const tokenSymbol = networkConfig.name === "BNB Chain" ? "BNB" 
                      : networkConfig.name === "Polygon" ? "MATIC" 
                      : "ETH";
    
    const txHash = transferReceipt.hash || transferTx.hash;
    
    if (explorerUrl) {
      const txLink = `<a href="${explorerUrl}/tx/${txHash}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">${txHash.slice(0, 10)}...${txHash.slice(-8)}</a>`;
      el.status.innerHTML = `<div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 12px; border: 2px solid #10b981;">
        <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #065f46;">Payment Successful!</div>
        <div style="color: #1e7a3d; margin-bottom: 8px;">Amount: <strong>${ethers.formatEther(fixedAmount)} ${tokenSymbol}</strong></div>
        <div style="color: #1e7a3d; margin-bottom: 12px; font-size: 13px;">Gas Used: ${ethers.formatEther(transferReceipt.gasUsed * (gasEstimate.gasPrice || BigInt(1)))}</div>
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">TX Hash:<br/>${txLink}</div>
      </div>`;
    } else {
      el.status.innerHTML = `<div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 12px; border: 2px solid #10b981;">
        <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #065f46;">Payment Successful!</div>
        <div style="color: #1e7a3d; margin-bottom: 8px;">Amount: <strong>${ethers.formatEther(fixedAmount)} ${tokenSymbol}</strong></div>
        <div style="color: #1e7a3d; font-size: 13px;">To: <strong>${receiverAddress.slice(0, 6)}...${receiverAddress.slice(-4)}</strong></div>
      </div>`;
    }
    
  } catch (err) {
    console.error("❌ Payment execution error:", err);
    
    // Provide helpful error messages
    let userMessage = err.message;
    
    if (err.message.includes("insufficient funds")) {
      userMessage = "❌ Insufficient balance to cover transaction + gas fees. Please add more funds.";
    } else if (err.message.includes("user rejected")) {
      userMessage = "❌ Transaction cancelled by user.";
    } else if (err.message.includes("gas")) {
      userMessage = `❌ Gas error: ${err.message}. Try switching to a network with lower gas prices (Polygon, Arbitrum).`;
    } else if (err.message.includes("Unsupported network")) {
      userMessage = `❌ Network not supported. Please switch to Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, or Linea.`;
    } else {
      userMessage = `❌ Error: ${err.message}`;
    }
    
    setStatus(userMessage, "error");
  }
}

// Initialize when DOM is ready
async function init() {
  console.log("🚀 Checkout Initializing...");
  
  // Clear loading screen
  el.status.innerHTML = "";
  
  // Auto-connect if user already has a connected wallet
  if (typeof window.ethereum !== "undefined") {
    try {
      console.log("Checking for existing wallet connection...");
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        console.log("✓ User already connected, auto-connecting...");
        userAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        showAccountInfo();
        return;
      }
    } catch (err) {
      console.log("Auto-connect check failed:", err.message);
    }
  }
  
  // Show single "Connect Wallet" button
  const btn = document.createElement("button");
  btn.textContent = "� Connect Wallet to Pay";
  btn.style.cssText = `
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #2b5fff 0%, #1e3aaa 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 1000;
    position: relative;
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(43, 95, 255, 0.3);
  `;
  btn.onmouseover = () => {
    btn.style.transform = "translateY(-2px)";
    btn.style.boxShadow = "0 6px 20px rgba(43, 95, 255, 0.4)";
  };
  btn.onmouseout = () => {
    btn.style.transform = "translateY(0)";
    btn.style.boxShadow = "0 4px 12px rgba(43, 95, 255, 0.3)";
  };
  btn.onclick = () => showWalletModal();
  
  el.status.appendChild(btn);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}