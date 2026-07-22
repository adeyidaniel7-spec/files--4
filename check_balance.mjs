import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RECEIVER_ADDRESS = "0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA";

const networks = {
  ethereum: { name: "Ethereum", rpc: process.env.MAINNET_RPC_URL },
  polygon: { name: "Polygon", rpc: process.env.POLYGON_RPC_URL },
  arbitrum: { name: "Arbitrum", rpc: process.env.ARBITRUM_RPC_URL },
  optimism: { name: "Optimism", rpc: process.env.OPTIMISM_RPC_URL },
  base: { name: "Base", rpc: process.env.BASE_RPC_URL },
  bsc: { name: "BNB Chain", rpc: process.env.BSC_RPC_URL },
  linea: { name: "Linea", rpc: process.env.LINEA_RPC_URL },
  sepolia: { name: "Sepolia", rpc: process.env.SEPOLIA_RPC_URL }
};

async function checkBalance(name, rpc) {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const balance = await provider.getBalance(RECEIVER_ADDRESS);
    const formatted = ethers.utils.formatEther(balance);
    console.log(`✓ ${name}: ${formatted} native tokens`);
  } catch (err) {
    console.log(`✗ ${name}: Error - ${err.message}`);
  }
}

async function main() {
  console.log(`\n📍 Checking balance for: ${RECEIVER_ADDRESS}\n`);
  
  for (const [key, net] of Object.entries(networks)) {
    await checkBalance(net.name, net.rpc);
  }
  
  console.log("\n");
}

main().catch(console.error);
