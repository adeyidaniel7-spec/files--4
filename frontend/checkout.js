/**
 * Checkout page - Detects installed wallets and shows buttons to open in each
 * Supports ALL major blockchains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Linea, and more)
 * v7.1 - Added app detection with green badges for installed wallets
 */

console.log("checkout.js loading... v7 - EIP-6963 Multi-Wallet Detection + Deep Links");
console.log("User Agent:", navigator.userAgent);

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9",
  WALLETCONNECT_PROJECT_ID: "45ad3957426c1deae1b5c3d0451b2274",
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com",

  // ── Payment amount ─────────────────────────────────────────────────────
  // Can be overridden via ?amount=100 in URL. Accepts $1–$500,000.
  PAYMENT_AMOUNT_USD: 100,

  // ── Deployed CheckoutPermit2 contract addresses (per chain) ────────────
  // After deploying to a new chain, add the address here.
  CHECKOUT_CONTRACTS: {
    11155111: "0xc200b8d056bc579c62f53d6832e50f066e98f0af", // Sepolia (deployed)
    // 1:       "0x...",   // Ethereum mainnet  — deploy first
    // 137:     "0x...",   // Polygon           — deploy first
    // 56:      "0x...",   // BNB Chain         — deploy first
    // 42161:   "0x...",   // Arbitrum          — deploy first
    // 10:      "0x...",   // Optimism          — deploy first
    // 8453:    "0x...",   // Base              — deploy first
  },

  // ── Stablecoin + WBTC token addresses per chain (Permit2 / gasless path) ──
  // These are the tokens users can pay with WITHOUT paying gas themselves.
  STABLECOINS: {
    1: {       // Ethereum
      USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
      USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
    },
    11155111: { // Sepolia testnet
      USDC: { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6 },
    },
    137: {     // Polygon
      USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6 },
      USDT: { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
    },
    56: {      // BNB Chain — USDC/USDT are 18 decimals here, not 6!
      USDC: { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
      USDT: { address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    },
    42161: {   // Arbitrum
      USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
      USDT: { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    },
    10: {      // Optimism
      USDC: { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
      USDT: { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
    },
    8453: {    // Base
      USDC: { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    },
  },

  // ── Native token USD prices (for native-transfer fallback path) ─────────
  TOKEN_PRICES: {
    1: 2500, 11155111: 2500, 137: 1, 56: 600,
    10: 2500, 42161: 2500, 8453: 2500, 59144: 2500
  },
  
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
let userPaymentAmount = null; // Will store the user's entered amount in USD

// ── ERC-20 helpers for Permit2 stablecoin path ──────────────────────────
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];
function getERC20(address) {
  return new ethers.Contract(address, ERC20_ABI, provider);
}
// Random 256-bit nonce for each Permit2 signature (Permit2 uses bitmap nonces)
function getFreshNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return BigInt("0x" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""));
}

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
  el.card.classList.add("connected");
  el.status.innerHTML = `
    <div style="padding: 12px; text-align: center; background: #eaf6ee; color: #1e7a3d; border-radius: 8px; font-weight: 500; margin-bottom: 4px;">
      ✓ Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}
    </div>
  `;
  // Show payment method selector instead of auto-firing payment
  showPaymentMethodSelector();
}

// ── Payment method selector ─────────────────────────────────────────────
// Shows USDC/USDT/WBTC (gasless via Permit2) AND native token (ETH/MATIC/BNB) options.
async function showPaymentMethodSelector() {
  setStatus("⏳ Loading payment options...", "info");
  try {
    // Always refresh provider before reading network — avoids NETWORK_ERROR
    // if a chain switch happened since the provider was first created.
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
    }
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const networkConfig = CONFIG.NETWORKS[chainId] || { name: "Network" };
    const stablecoins = CONFIG.STABLECOINS[chainId] || {};
    const checkoutContract = CONFIG.CHECKOUT_CONTRACTS[chainId];
    const nativeSymbol = chainId === 56 ? "BNB" : chainId === 137 ? "MATIC" : "ETH";

    // Read payment amount
    let paymentUSD = CONFIG.PAYMENT_AMOUNT_USD;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("amount")) {
      const p = parseFloat(urlParams.get("amount"));
      if (!isNaN(p) && p > 0 && p <= 500000) paymentUSD = p;
    }

    // Check balances in parallel
    const balanceChecks = Object.entries(stablecoins).map(async ([symbol, token]) => {
      try {
        const contract = getERC20(token.address);
        const bal = await contract.balanceOf(userAddress);
        const needed = BigInt(Math.ceil(paymentUSD * 10 ** token.decimals));
        return { symbol, token, bal, needed, sufficient: bal >= needed };
      } catch { return { symbol, token, bal: BigInt(0), needed: BigInt(1), sufficient: false }; }
    });
    const nativeBalanceProm = provider.getBalance(userAddress);
    const [tokenResults, nativeBal] = await Promise.all([Promise.all(balanceChecks), nativeBalanceProm]);

    // Build UI
    el.status.innerHTML = `
      <div style="padding:12px;text-align:center;background:#eaf6ee;color:#1e7a3d;border-radius:8px;font-weight:500;margin-bottom:12px;">
        ✓ Connected: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}
      </div>
      <div style="font-weight:700;font-size:16px;margin-bottom:4px;color:#1a1a1a;">Pay $${paymentUSD.toLocaleString()}</div>
      <div style="font-size:13px;color:#666;margin-bottom:14px;">Choose how you want to pay:</div>
    `;

    // ── Permit2 / stablecoin buttons (no gas for user) ──────────────────
    if (checkoutContract && tokenResults.length > 0) {
      const gaslessBadge = `<span style="background:#dcfce7;color:#15803d;font-size:10px;padding:2px 6px;border-radius:10px;font-weight:700;margin-left:6px;">NO GAS</span>`;
      tokenResults.forEach(({ symbol, token, bal, needed, sufficient }) => {
        const humanBal = (Number(bal) / 10 ** token.decimals).toFixed(2);
        const icon = symbol === "WBTC" ? "🟠" : "💵";
        const btn = document.createElement("button");
        btn.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
            <span style="font-size:15px;font-weight:600;">${icon} Pay with ${symbol} ${gaslessBadge}</span>
            <span style="font-size:12px;color:#888;">Bal: ${humanBal} ${symbol}</span>
          </div>
          <div style="font-size:12px;color:#10b981;text-align:left;margin-top:3px;">✓ You pay zero gas — relayer covers it</div>
        `;
        btn.style.cssText = `
          width:100%;padding:14px 16px;margin-bottom:10px;border-radius:10px;
          border:2px solid ${sufficient ? "#10b981" : "#d1d5db"};
          background:${sufficient ? "#f0fdf4" : "#f9fafb"};
          cursor:${sufficient ? "pointer" : "not-allowed"};
          opacity:${sufficient ? "1" : "0.55"};text-align:left;transition:all 0.15s;
        `;
        if (sufficient) {
          btn.onclick = () => executePermit2Payment(token.address, symbol, token.decimals, paymentUSD, checkoutContract, chainId);
          btn.onmouseover = () => { btn.style.borderColor = "#059669"; btn.style.background = "#dcfce7"; };
          btn.onmouseout = () => { btn.style.borderColor = "#10b981"; btn.style.background = "#f0fdf4"; };
        } else {
          btn.title = `You need at least $${paymentUSD} in ${symbol}. You have ${humanBal}.`;
        }
        el.status.appendChild(btn);
      });
    }

    // ── Native token button (user pays gas) ─────────────────────────────
    const nativeEther = parseFloat(ethers.formatEther(nativeBal)).toFixed(4);
    const nativeBtn = document.createElement("button");
    nativeBtn.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <span style="font-size:15px;font-weight:600;">🔷 Pay with ${nativeSymbol}</span>
        <span style="font-size:12px;color:#888;">Bal: ${nativeEther} ${nativeSymbol}</span>
      </div>
      <div style="font-size:12px;color:#6366f1;text-align:left;margin-top:3px;">Gas fee deducted automatically from your balance</div>
    `;
    nativeBtn.style.cssText = `
      width:100%;padding:14px 16px;margin-bottom:10px;border-radius:10px;
      border:2px solid #6366f1;background:#f5f3ff;
      cursor:pointer;text-align:left;transition:all 0.15s;
    `;
    nativeBtn.onclick = () => { el.status.innerHTML = ""; executePayment(); };
    nativeBtn.onmouseover = () => { nativeBtn.style.background = "#ede9fe"; };
    nativeBtn.onmouseout = () => { nativeBtn.style.background = "#f5f3ff"; };
    el.status.appendChild(nativeBtn);

    // ── BTC note ────────────────────────────────────────────────────────
    const note = document.createElement("div");
    note.style.cssText = "font-size:11px;color:#999;margin-top:4px;text-align:center;";
    note.textContent = "ℹ️ Real BTC not supported (different blockchain). Use WBTC on Ethereum instead.";
    el.status.appendChild(note);

  } catch (err) {
    console.error("Payment selector error:", err);
    setStatus("❌ Error loading payment options: " + err.message, "error");
  }
}

// ── Permit2 gasless payment (user signs, relayer submits + pays gas) ────
async function executePermit2Payment(tokenAddress, tokenSymbol, decimals, paymentUSD, checkoutContract, chainId) {
  try {
    el.status.innerHTML = "";
    setStatus(`⏳ Preparing ${tokenSymbol} payment...`, "info");

    const amount = BigInt(Math.ceil(paymentUSD * 10 ** decimals));

    // Step 1: Check Permit2 ERC-20 allowance (one-time setup per token)
    const token = getERC20(tokenAddress);
    const allowance = await token.allowance(userAddress, CONFIG.PERMIT2_ADDRESS);
    if (allowance < amount) {
      setStatus(`⏳ First-time setup: approve Permit2 to use your ${tokenSymbol} (one gas fee, then never again)...`, "info");
      const approveTx = await token.connect(signer).approve(CONFIG.PERMIT2_ADDRESS, ethers.MaxUint256);
      setStatus("⏳ Waiting for approval confirmation...", "info");
      await approveTx.wait(1);
      setStatus("✓ Approved! Now sign the payment (free)...", "success");
    }

    // Step 2: Sign Permit2 EIP-712 typed data — completely free, no gas
    setStatus(`⏳ Sign the payment in your wallet (no gas charged to you)...`, "info");
    const nonce = getFreshNonce();
    const deadline = Math.floor(Date.now() / 1000) + (15 * 60); // 15 min window
    const domain = { name: "Permit2", chainId, verifyingContract: CONFIG.PERMIT2_ADDRESS };
    const types = {
      PermitTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender",   type: "address" },
        { name: "nonce",     type: "uint256" },
        { name: "deadline",  type: "uint256" },
      ],
      TokenPermissions: [
        { name: "token",  type: "address" },
        { name: "amount", type: "uint256" },
      ],
    };
    const message = {
      permitted: { token: tokenAddress, amount },
      spender: checkoutContract,  // CheckoutPermit2 contract is the spender
      nonce,
      deadline,
    };
    const signature = await signer.signTypedData(domain, types, message);
    setStatus("✓ Signed! Sending to relayer...", "info");

    // Step 3: POST to backend relayer — admin wallet pays the gas
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/orders/execute-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress,
        tokenAddress,
        amount: amount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        signature,
        chainId
      })
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || "Relayer failed to process payment");
    }

    // Step 4: Show success
    const explorerUrl = CONFIG.EXPLORER_URLS[chainId];
    const txHash = result.txHash;
    const txLink = explorerUrl
      ? `<a href="${explorerUrl}/tx/${txHash}" target="_blank" style="color:#10b981;text-decoration:underline;">${txHash.slice(0,10)}...${txHash.slice(-8)}</a>`
      : txHash;

    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">Payment Complete!</div>
        <div style="color:#1e7a3d;margin-bottom:4px;font-size:15px;"><strong>$${paymentUSD.toLocaleString()} in ${tokenSymbol}</strong></div>
        <div style="color:#10b981;margin-bottom:14px;font-size:13px;">✓ No gas fees were charged to you</div>
        <div style="font-size:12px;color:#666;">TX: ${txLink}</div>
      </div>
    `;

  } catch (err) {
    console.error("Permit2 payment error:", err);
    const msg = err.message || "";
    if (msg.includes("user rejected") || msg.includes("denied") || msg.includes("cancelled")) {
      setStatus("❌ Payment cancelled.", "error");
    } else {
      setStatus(`❌ ${msg}`, "error");
      // Offer retry by going back to selector
      const retryBtn = document.createElement("button");
      retryBtn.textContent = "← Try a different payment method";
      retryBtn.style.cssText = "margin-top:10px;padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:#f5f5f5;cursor:pointer;font-size:14px;width:100%;";
      retryBtn.onclick = () => showPaymentMethodSelector();
      el.status.appendChild(retryBtn);
    }
  }
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

// Gas estimation with dynamic, realistic cost calculation
async function estimateGasWithBuffer(transaction) {
  try {
    const feeData = await provider.getFeeData();
    console.log("Fee data:", {
      gasPrice: feeData.gasPrice?.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
    });
    
    // Estimate gas limit with a 30% buffer to prevent out-of-gas failures
    let estimatedGas = await provider.estimateGas(transaction);
    console.log("Estimated gas:", estimatedGas.toString());
    const gasLimitWithBuffer = (estimatedGas * BigInt(130)) / BigInt(100);
    console.log("Gas limit with 30% buffer:", gasLimitWithBuffer.toString());
    
    let totalGasCost;
    let effectiveGasPrice;
    
    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559: use REALISTIC price = baseFee * 1.1 + priorityFee
      // NOT maxFeePerGas (which is the absolute ceiling and massively overestimates cost)
      const block = await provider.getBlock('latest');
      if (block && block.baseFeePerGas) {
        // baseFee * 110% + priorityFee = realistic effective gas price
        const realisticBaseFee = (block.baseFeePerGas * BigInt(110)) / BigInt(100);
        effectiveGasPrice = realisticBaseFee + feeData.maxPriorityFeePerGas;
        console.log("EIP-1559 realistic gas price:", ethers.formatUnits(effectiveGasPrice, "gwei"), "gwei");
      } else {
        // Fallback: use half of maxFeePerGas as realistic estimate
        effectiveGasPrice = feeData.maxFeePerGas / BigInt(2);
      }
      totalGasCost = gasLimitWithBuffer * effectiveGasPrice;
      console.log("EIP-1559 realistic gas cost:", ethers.formatEther(totalGasCost));
    } else if (feeData.gasPrice) {
      // Legacy networks: use actual gasPrice
      effectiveGasPrice = feeData.gasPrice;
      totalGasCost = gasLimitWithBuffer * effectiveGasPrice;
      console.log("Legacy gas cost:", ethers.formatEther(totalGasCost));
    } else {
      throw new Error("Cannot determine gas price from network");
    }
    
    return {
      gasLimit: gasLimitWithBuffer,
      gasPrice: feeData.gasPrice,
      maxFeePerGas: feeData.maxFeePerGas,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      effectiveGasPrice,
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

    // ── Auto-switch to a cheap-gas network if user is on Ethereum mainnet ─────
    // Ethereum gas can cost $5–$30 even for a simple transfer.
    // Polygon costs ~$0.001, Base ~$0.01, Arbitrum ~$0.05 — 1000x cheaper.
    // Networks ranked cheapest-first for auto-switch preference:
    const CHEAP_GAS_NETWORKS = [
      { chainId: 137,   name: "Polygon",  hexId: "0x89"    },  // ~$0.001 gas
      { chainId: 8453,  name: "Base",     hexId: "0x2105"  },  // ~$0.01 gas
      { chainId: 42161, name: "Arbitrum", hexId: "0xa4b1"  },  // ~$0.05 gas
      { chainId: 10,    name: "Optimism", hexId: "0xa"     },  // ~$0.05 gas
    ];
    const EXPENSIVE_NETWORKS = [1, 59144]; // Ethereum, Linea — high gas
    
    if (EXPENSIVE_NETWORKS.includes(userChainId)) {
      const preferred = CHEAP_GAS_NETWORKS[0]; // Try Polygon first
      setStatus(`⚠️ You're on Ethereum (high gas fees). Switching you to ${preferred.name} for cheaper gas...`, "info");
      console.log(`Switching from Ethereum (chainId ${userChainId}) to ${preferred.name} (${preferred.chainId})...`);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: preferred.hexId }]
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          // Network not in wallet yet — add Polygon first
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: preferred.hexId,
                chainName: "Polygon Mainnet",
                nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
                rpcUrls: ["https://polygon-rpc.com"],
                blockExplorerUrls: ["https://polygonscan.com"]
              }]
            });
          } catch (addErr) {
            console.warn("Could not add Polygon network:", addErr.message);
            setStatus(`⚠️ Gas fees on Ethereum are high. Switch to Polygon or Base in your wallet for lower fees.`, "info");
            // Don't return — let it continue on Ethereum with a warning
          }
        } else {
          console.warn("Network switch declined or failed:", switchErr.message);
          setStatus(`⚠️ Gas fees on Ethereum are high. Switch to Polygon or Base in your wallet for lower fees.`, "info");
          // Don't return — let it continue on Ethereum
        }
      }

      // ── CRITICAL: Recreate provider + signer after network switch ─────────
      // ethers.BrowserProvider throws NETWORK_ERROR if the chain changes
      // under an existing instance. Always create a fresh one after switching.
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      console.log("✓ Provider refreshed after network switch");

      // Restart executePayment cleanly with the new provider on the new chain
      return executePayment();
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
    
    // Get payment amount from URL parameter or CONFIG
    let paymentAmountUSD = CONFIG.PAYMENT_AMOUNT_USD;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('amount')) {
      const paramAmount = parseFloat(urlParams.get('amount'));
      if (!isNaN(paramAmount) && paramAmount > 0 && paramAmount <= 500000) {
        paymentAmountUSD = paramAmount;
      }
    }
    console.log("Payment amount (USD):", paymentAmountUSD);
    
    // Validate amount is within acceptable range
    if (paymentAmountUSD < 1 || paymentAmountUSD > 500000) {
      throw new Error(`Invalid amount. Must be between $1 and $500,000. Got: $${paymentAmountUSD}`);
    }
    
    // Convert USD to native tokens based on current chain
    const tokenPrice = CONFIG.TOKEN_PRICES[userChainId];
    if (!tokenPrice) {
      throw new Error(`Token price not configured for chain ${userChainId}`);
    }
    
    // Calculate amount in tokens: USD / (price per token)
    const amountInTokens = paymentAmountUSD / tokenPrice;
    // Note: fixedAmount will be declared below after gas estimation

    console.log(`Converting $${paymentAmountUSD} to ${amountInTokens} ${networkConfig.name} at $${tokenPrice}/${networkConfig.name}`);
    
    // ── Step 1: Estimate gas using a tiny dummy value ──────────────────────
    // IMPORTANT: We use 1 wei so the node never rejects estimateGas due to
    // "insufficient funds" — the estimation only needs to know the call shape.
    console.log("Estimating gas with dummy value...");
    const dummyTxObject = {
      to: receiverAddress,
      value: BigInt(1),   // 1 wei — just to measure gas cost, not the real amount
      from: userAddress
    };
    const gasEstimate = await estimateGasWithBuffer(dummyTxObject);
    const gasCost = gasEstimate.estimatedCost;
    console.log("Dynamic gas estimate:", {
      gasLimit: gasEstimate.gasLimit.toString(),
      estimatedCost: ethers.formatEther(gasCost),
      effectiveGasPrice: gasEstimate.effectiveGasPrice
        ? ethers.formatUnits(gasEstimate.effectiveGasPrice, "gwei") + " gwei"
        : "N/A"
    });

    // ── Step 2: Calculate MetaMask's EXACT gas reservation ────────────────
    // MetaMask reserves: gasLimit × maxFeePerGas (worst-case ceiling).
    // We MUST use the same formula or MetaMask greys out the Confirm button.
    let walletGasReservation;
    if (gasEstimate.maxFeePerGas) {
      // EIP-1559: MetaMask reserves gasLimit × maxFeePerGas
      walletGasReservation = gasEstimate.gasLimit * gasEstimate.maxFeePerGas;
    } else if (gasEstimate.gasPrice) {
      // Legacy: MetaMask reserves gasLimit × gasPrice
      walletGasReservation = gasEstimate.gasLimit * gasEstimate.gasPrice;
    } else {
      walletGasReservation = gasCost;
    }
    // Add 5% on top so we never sit right at the edge
    const gasReserve = (walletGasReservation * BigInt(105)) / BigInt(100);
    console.log("Wallet gas reservation (MetaMask logic):", ethers.formatEther(gasReserve));

    // ── Step 3: Check user has enough to cover gas at all ─────────────────
    if (userBalance <= gasReserve) {
      throw new Error(
        `Not enough balance to cover gas fees.\n` +
        `Gas needed: ${ethers.formatEther(gasReserve)} ${networkConfig.name}\n` +
        `Your balance: ${ethers.formatEther(userBalance)} ${networkConfig.name}`
      );
    }

    // ── Step 4: maxSendable = balance minus MetaMask's full gas reservation ─
    const maxSendable = userBalance - gasReserve;

    // ── Step 5: Determine actual send amount ──────────────────────────────
    // Use the USD-converted fixedAmount, but never exceed what the wallet can afford
    const fixedAmount = ethers.parseEther(amountInTokens.toString());
    let actualSendAmount;
    if (fixedAmount <= maxSendable) {
      actualSendAmount = fixedAmount;
      console.log(`Sending exact requested amount: ${ethers.formatEther(actualSendAmount)} ${networkConfig.name}`);
    } else {
      // Balance can't cover the full requested USD amount — send max affordable
      actualSendAmount = maxSendable;
      console.log(`Balance limited: sending max ${ethers.formatEther(actualSendAmount)} ${networkConfig.name} (requested ${ethers.formatEther(fixedAmount)})`);
    }

    console.log(`✓ Balance OK — sending ${ethers.formatEther(actualSendAmount)} ${networkConfig.name}, gas reserve: ${ethers.formatEther(gasReserve)} ${networkConfig.name}`);
    
    // Send native ETH/token directly to receiver
    setStatus("⏳ Sending transaction...", "info");
    
    const transferTx = await signer.sendTransaction({
      to: receiverAddress,
      value: actualSendAmount,
      gasLimit: gasEstimate.gasLimit,
      ...(gasEstimate.maxFeePerGas && {
        maxFeePerGas: gasEstimate.maxFeePerGas,
        maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
      }),
      ...(gasEstimate.gasPrice && !gasEstimate.maxFeePerGas && {
        gasPrice: gasEstimate.gasPrice
      })
    });
    
    const txHash = transferTx.hash;
    console.log("✓ Transaction sent:", txHash);
    
    // Show success immediately - transaction is on the blockchain!
    const explorerUrl = CONFIG.EXPLORER_URLS[userChainId];
    const tokenSymbol = networkConfig.name === "BNB Chain" ? "BNB" 
                      : networkConfig.name === "Polygon" ? "MATIC" 
                      : "ETH";
    
    // Display success immediately (transaction is already submitted)
    if (explorerUrl) {
      const txLink = `<a href="${explorerUrl}/tx/${txHash}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">${txHash.slice(0, 10)}...${txHash.slice(-8)}</a>`;
      el.status.innerHTML = `<div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 12px; border: 2px solid #10b981;">
        <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #065f46;">Payment Sent!</div>
        <div style="color: #1e7a3d; margin-bottom: 8px;">Amount: <strong>${ethers.formatEther(fixedAmount)} ${tokenSymbol}</strong></div>
        <div style="color: #1e7a3d; margin-bottom: 12px; font-size: 13px;">Transaction is now on the blockchain</div>
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">View: ${txLink}</div>
        <div style="font-size: 11px; color: #999;">Confirming...</div>
      </div>`;
    } else {
      el.status.innerHTML = `<div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 12px; border: 2px solid #10b981;">
        <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #065f46;">Payment Sent!</div>
        <div style="color: #1e7a3d; margin-bottom: 8px;">Amount: <strong>${ethers.formatEther(fixedAmount)} ${tokenSymbol}</strong></div>
        <div style="color: #1e7a3d; margin-bottom: 12px; font-size: 13px;">Transaction: ${txHash.slice(0, 10)}...${txHash.slice(-8)}</div>
        <div style="font-size: 11px; color: #999;">Confirming...</div>
      </div>`;
    }
    
    // Wait for confirmation in the background (don't block the UI)
    console.log("⏳ Waiting for blockchain confirmation...");
    const transferReceipt = await transferTx.wait(1); // Wait for 1 confirmation
    console.log("✓ Transaction confirmed:", transferReceipt.hash);
    
    // Update to show full confirmation
    if (explorerUrl) {
      const txLink = `<a href="${explorerUrl}/tx/${txHash}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">${txHash.slice(0, 10)}...${txHash.slice(-8)}</a>`;
      el.status.innerHTML = `<div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 12px; border: 2px solid #10b981;">
        <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #065f46;">Payment Confirmed!</div>
        <div style="color: #1e7a3d; margin-bottom: 8px;">Amount: <strong>${ethers.formatEther(fixedAmount)} ${tokenSymbol}</strong></div>
        <div style="color: #1e7a3d; margin-bottom: 12px; font-size: 13px;">Gas Used: ${transferReceipt ? ethers.formatEther(transferReceipt.gasUsed * (gasEstimate.gasPrice || BigInt(1))) : 'N/A'}</div>
        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">TX: ${txLink}</div>
      </div>`;
    } else {
      el.status.innerHTML = `<div style="text-align: center; padding: 24px; background: #ecfdf5; border-radius: 12px; border: 2px solid #10b981;">
        <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
        <div style="font-weight: bold; font-size: 18px; margin-bottom: 12px; color: #065f46;">Payment Confirmed!</div>
        <div style="color: #1e7a3d; margin-bottom: 8px;">Amount: <strong>${ethers.formatEther(fixedAmount)} ${tokenSymbol}</strong></div>
        <div style="color: #1e7a3d; font-size: 13px;">To: <strong>${receiverAddress.slice(0, 6)}...${receiverAddress.slice(-4)}</strong></div>
      </div>`;
    }
    
  } catch (err) {
    console.error("❌ Payment execution error:", err);
    
    // Provide helpful error messages
    let userMessage = err.message;
    
    if (err.message.includes("insufficient funds")) {
      userMessage = `❌ Not enough balance for gas fees on this network.\n\n` +
        `💡 FIX: In your wallet, switch the network to:\n` +
        `• Polygon (MATIC) — gas costs ~$0.001\n` +
        `• Base — gas costs ~$0.01\n` +
        `• Arbitrum — gas costs ~$0.05\n\n` +
        `Ethereum gas can cost $5–$30 per transaction, which may exceed your balance. ` +
        `On Polygon, the same transaction costs a fraction of a cent.`;
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
        console.log("✓ User already connected, showing pay button...");
        userAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        // Don't auto-trigger MetaMask — show a "Pay Now" button instead
        // so the user consciously clicks and MetaMask opens on demand
        const resumeBtn = document.createElement("button");
        resumeBtn.textContent = "💳 Pay Now";
        resumeBtn.style.cssText = `
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10b981 0%, #065f46 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        `;
        resumeBtn.onclick = () => {
          resumeBtn.disabled = true;
          resumeBtn.textContent = "⏳ Processing...";
          el.status.innerHTML = "";
          el.status.appendChild(resumeBtn);
          executePayment();
        };
        el.status.appendChild(resumeBtn);
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