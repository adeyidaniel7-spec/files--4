const { ethers } = require('ethers');

// Permit2 ABI - we call this directly instead of deploying our own contract
const PERMIT2_ABI = [
  "function permitTransferFrom((address token, uint256 amount) permitted, (address from, address to, uint160 amount) transferDetails, address owner, bytes signature) external"
];

// Receiver address where payments go
const RECEIVER_ADDRESS = process.env.RECEIVER_ADDRESS || "0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA";

// Relayer wallet - backend uses this to submit transactions (pays gas)
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;

console.log("🚀 Payment API initialized");
console.log("RELAYER_PRIVATE_KEY set:", !!RELAYER_PRIVATE_KEY);
console.log("RECEIVER_ADDRESS:", RECEIVER_ADDRESS);

// Comprehensive multi-network EVM support configuration
const NETWORKS = {
  1: {
    name: "Ethereum",
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
  },
  42161: {
    name: "Arbitrum",
    rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
  },
  10: {
    name: "Optimism",
    rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
  },
  8453: {
    name: "Base",
    rpcUrl: "https://base-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
  },
  59144: {
    name: "Linea",
    rpcUrl: "https://rpc.linea.build",
  },
  137: {
    name: "Polygon",
    rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
  },
  56: {
    name: "BNB Chain",
    rpcUrl: "https://bsc-dataseed.bnbchain.org:443",
  },
  11155111: {
    name: "Sepolia Testnet",
    rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/XqcVRs6cpYTclyXhnrU8N",
  },
};

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'Payment API is running',
        relayerConfigured: !!RELAYER_PRIVATE_KEY,
        timestamp: new Date().toISOString()
      });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { chainId, userAddress, tokenAddress, amount, nonce, deadline, signature } = req.body;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 PAYMENT PROCESSING STARTED');
    console.log('Relayer Key Status:', RELAYER_PRIVATE_KEY ? '✓ SET' : '❌ NOT SET');
    console.log('Chain ID:          ', chainId);
    console.log('User Address:      ', userAddress);
    console.log('Token Address:     ', tokenAddress);
    console.log('Amount (wei):      ', amount);
    console.log('Nonce:             ', nonce);
    console.log('Signature Length:  ', signature.length, 'chars');

    // Check if chain is supported
    if (!NETWORKS[chainId]) {
      const supportedChains = Object.entries(NETWORKS)
        .map(([id, info]) => `${info.name} (${id})`)
        .join(", ");
      console.error('❌ Unsupported chain requested:', chainId);
      throw new Error(`Chain ${chainId} not supported. Supported: ${supportedChains}`);
    }

    const network = NETWORKS[chainId];
    const rpcUrl = network.rpcUrl;

    if (!rpcUrl) {
      console.error('❌ Missing RPC URL for chain:', chainId);
      throw new Error(`Missing RPC configuration for ${network.name} (${chainId})`);
    }

    console.log(`✓ Network: ${network.name}`);
    console.log(`✓ Receiver: ${RECEIVER_ADDRESS}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    console.log('🔗 Encoding permitTransferFrom() transaction via Permit2...');

    const permit2Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const permit2 = new ethers.Contract(permit2Address, PERMIT2_ABI, provider);

    const permitted = {
      token: tokenAddress,
      amount: amount
    };

    const transferDetails = {
      from: userAddress,
      to: RECEIVER_ADDRESS,
      amount: amount
    };

    const txData = permit2.interface.encodeFunctionData('permitTransferFrom', [
      permitted,
      transferDetails,
      userAddress,
      signature
    ]);

    // Check if relayer wallet is configured
    if (!RELAYER_PRIVATE_KEY) {
      console.warn('⚠️  RELAYER_PRIVATE_KEY not configured. Returning transaction data for user to submit.');
      
      const txObject = {
        to: permit2Address,
        data: txData,
        gasLimit: '300000'
      };
      
      return res.status(200).json({
        success: true,
        message: 'Transaction data ready - user must submit via their wallet',
        network: network.name,
        chainId: chainId,
        amount: ethers.formatUnits(amount, 6),
        receivedBy: RECEIVER_ADDRESS,
        transaction: txObject,
        note: 'RELAYER_PRIVATE_KEY not set - user pays gas fee from their native token balance',
        transactionHash: null
      });
    }

    console.log('📤 Backend relayer submitting transaction...');
    
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
    console.log('✓ Relayer wallet:', relayerWallet.address);

    const txResponse = await relayerWallet.sendTransaction({
      to: permit2Address,
      data: txData,
      gasLimit: '300000'
    });

    console.log('✅ Transaction submitted by relayer!');
    console.log('📤 TX Hash:', txResponse.hash);

    const receipt = await txResponse.wait();
    
    if (receipt && receipt.status === 1) {
      console.log('✅ Transaction confirmed!');
      console.log('💰 USDC transferred:', ethers.formatUnits(amount, 6), 'to', RECEIVER_ADDRESS);
      
      return res.status(200).json({
        success: true,
        message: 'Payment processed successfully!',
        network: network.name,
        chainId: chainId,
        transactionHash: txResponse.hash,
        amount: ethers.formatUnits(amount, 6),
        receivedBy: RECEIVER_ADDRESS
      });
    } else {
      throw new Error('Transaction failed on chain');
    }

  } catch (error) {
    console.error('❌ Payment processing error:', error.message);
    console.log('═══════════════════════════════════════════════════════════');
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
