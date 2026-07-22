import { ethers } from 'ethers';

const CHECKOUT_ABI = [
  "function pay(address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external"
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
  console.log('📝 PAYMENT PROCESSING STARTED');
  console.log('User Address:      ', userAddress);
  console.log('Token Address:     ', tokenAddress);
  console.log('Amount (wei):      ', amount);
  console.log('Nonce:             ', nonce);
  console.log('Signature Length:  ', signature.length, 'chars');

  try {
    const rpcUrl = process.env.RPC_URL;
    const contractAddress = process.env.CHECKOUT_CONTRACT_ADDRESS;

    if (!rpcUrl || !contractAddress) {
      throw new Error('Missing environment variables: RPC_URL or CHECKOUT_CONTRACT_ADDRESS');
    }

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
      transaction: txObject,
      note: 'User pays gas fee from their ETH balance'
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
