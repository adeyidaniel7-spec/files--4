import { ethers } from 'ethers';

const CHECKOUT_ABI = [
  "function pay(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external"
];

// Comprehensive multi-network EVM support configuration
// Supports all major EVM blockchains
const NETWORKS = {
  // ════════════════════════════════════════════════════════════════════════════
  // ETHEREUM ECOSYSTEM
  // ════════════════════════════════════════════════════════════════════════════
  
  // Ethereum Mainnet
  1: {
    name: "Ethereum",
    rpcUrl: process.env.MAINNET_RPC_URL,
    contractAddress: process.env.MAINNET_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // LAYER 2 NETWORKS
  // ════════════════════════════════════════════════════════════════════════════
  
  // Arbitrum
  42161: {
    name: "Arbitrum",
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    contractAddress: process.env.ARBITRUM_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // Optimism
  10: {
    name: "Optimism",
    rpcUrl: process.env.OPTIMISM_RPC_URL,
    contractAddress: process.env.OPTIMISM_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // Base
  8453: {
    name: "Base",
    rpcUrl: process.env.BASE_RPC_URL,
    contractAddress: process.env.BASE_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // Linea
  59144: {
    name: "Linea",
    rpcUrl: process.env.LINEA_RPC_URL,
    contractAddress: process.env.LINEA_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // SIDE CHAINS / ALT L1
  // ════════════════════════════════════════════════════════════════════════════
  
  // Polygon
  137: {
    name: "Polygon",
    rpcUrl: process.env.POLYGON_RPC_URL,
    contractAddress: process.env.POLYGON_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // BNB Chain
  56: {
    name: "BNB Chain",
    rpcUrl: process.env.BSC_RPC_URL,
    contractAddress: process.env.BSC_CHECKOUT_CONTRACT_ADDRESS,
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // FUTURE NETWORKS
  // ════════════════════════════════════════════════════════════════════════════
  
  // Monad (when mainnet launches)
  // 99999: {
  //   name: "Monad",
  //   rpcUrl: process.env.MONAD_RPC_URL,
  //   contractAddress: process.env.MONAD_CHECKOUT_CONTRACT_ADDRESS,
  // },
  
  // ════════════════════════════════════════════════════════════════════════════
  // TESTNETS
  // ════════════════════════════════════════════════════════════════════════════
  
  // Sepolia Testnet
  11155111: {
    name: "Sepolia Testnet",
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    contractAddress: process.env.SEPOLIA_CHECKOUT_CONTRACT_ADDRESS,
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { chainId, userAddress, tokenAddress, amount, nonce, deadline, signature } = req.body;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 PAYMENT PROCESSING STARTED');
  console.log('Chain ID:          ', chainId);
  console.log('User Address:      ', userAddress);
  console.log('Token Address:     ', tokenAddress);
  console.log('Amount (wei):      ', amount);
  console.log('Nonce:             ', nonce);
  console.log('Signature Length:  ', signature.length, 'chars');

  try {
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
    const contractAddress = network.contractAddress;

    if (!rpcUrl) {
      console.error('❌ Missing RPC URL for chain:', chainId);
      throw new Error(`Missing RPC configuration for ${network.name} (${chainId})`);
    }

    if (!contractAddress) {
      console.error('❌ Missing contract address for chain:', chainId);
      throw new Error(`Contract not deployed on ${network.name} (${chainId}). Please deploy first.`);
    }

    console.log(`✓ Network: ${network.name}`);
    console.log(`✓ Contract: ${contractAddress}`);

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    console.log('🔗 Encoding pay() transaction...');

    const contract = new ethers.Contract(contractAddress, CHECKOUT_ABI, provider);

    // Encode the transaction data
    const txData = contract.interface.encodeFunctionData('pay', [
      tokenAddress,
      amount,
      nonce,
      deadline,
      signature
    ]);

    console.log('📤 Building transaction for user to submit...');
    
    // Return the transaction data for the user's wallet to submit
    // This way the user pays gas and msg.sender = user (required by contract)
    const txObject = {
      to: contractAddress,
      data: txData,
      gasLimit: '200000'
    };

    console.log('✅ Transaction data ready for user wallet!');
    console.log('═══════════════════════════════════════════════════════════');

    return res.status(200).json({
      success: true,
      message: 'Transaction data ready - user must submit via their wallet',
      network: network.name,
      chainId: chainId,
      transaction: txObject,
      note: 'User pays gas fee from their ETH/native token balance'
    });

  } catch (error) {
    console.error('❌ Payment processing error:', error.message);
    console.log('═══════════════════════════════════════════════════════════');
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}
