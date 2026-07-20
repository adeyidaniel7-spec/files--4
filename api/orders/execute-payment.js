import { ethers } from 'ethers';

const CHECKOUT_ABI = [
  "function pay(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external payable"
];

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

  const { userAddress, tokenAddress, amount, nonce, deadline, signature } = req.body;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 PAYMENT RELAYING STARTED');
  console.log('User Address:      ', userAddress);
  console.log('Token Address:     ', tokenAddress);
  console.log('Amount (wei):      ', amount);
  console.log('Nonce:             ', nonce);
  console.log('Signature Length:  ', signature.length, 'chars');

  try {
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.CHECKOUT_CONTRACT_ADDRESS;

    if (!adminPrivateKey || !rpcUrl || !contractAddress) {
      throw new Error('Missing environment variables: ADMIN_PRIVATE_KEY, RPC_URL, or CHECKOUT_CONTRACT_ADDRESS');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const adminWallet = new ethers.Wallet(adminPrivateKey, provider);

    console.log('Admin wallet:      ', adminWallet.address);
    console.log('🔗 Encoding transaction data...');

    const contract = new ethers.Contract(contractAddress, CHECKOUT_ABI, adminWallet);

    console.log('⛽ Sending transaction from admin wallet...');
    const tx = await contract.pay(tokenAddress, amount, nonce, deadline, signature);

    console.log('✅ Transaction sent successfully!');
    console.log('Transaction Hash:  ', tx.hash);
    console.log('═══════════════════════════════════════════════════════════');

    return res.status(200).json({
      success: true,
      txHash: tx.hash,
      message: 'Payment relayed successfully'
    });

  } catch (error) {
    console.error('❌ Payment relay error:', error.message);
    console.log('═══════════════════════════════════════════════════════════');
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}
