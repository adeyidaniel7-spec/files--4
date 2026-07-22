# Multi-Network Checkout System

Your checkout system now supports **all major EVM networks**! 🚀

## Supported Networks

- ✅ **Ethereum** (Chain ID: 1) - Mainnet
- ✅ **Sepolia** (Chain ID: 11155111) - Testnet
- ✅ **Polygon** (Chain ID: 137)
- ✅ **Arbitrum** (Chain ID: 42161)
- ✅ **Optimism** (Chain ID: 10)
- ✅ **Base** (Chain ID: 8453)

## What's Configured

### Frontend (`/frontend/checkout.js`)
- ✅ Removes chain restrictions - Users can connect any wallet on any network
- ✅ Auto-detects user's current blockchain
- ✅ Validates network support with helpful error messages
- ✅ Passes `chainId` to backend for proper contract selection

### Backend (`/api/orders/execute-payment.js`)
- ✅ Multi-network configuration with separate RPC URLs
- ✅ Per-network contract address mapping
- ✅ Smart error messages for unsupported chains
- ✅ Deployed on Vercel (serverless)

### Hardhat Config (`hardhat.config.js`)
- ✅ Network definitions for all supported chains
- ✅ Ready to compile and deploy to any network

### Environment Variables (`.env`)
- ✅ RPC URLs for all networks from Alchemy
- ✅ Placeholder contract addresses for each network
- ✅ Single admin private key for all deployments

## Setup Instructions

### 1. Deploy to Each Network

For **each network** you want to support, run:

```bash
# Sepolia Testnet
RECEIVER_ADDRESS=0xYourWalletAddress npx hardhat run deploy.js --network sepolia

# Ethereum Mainnet (after getting testnet ETH)
RECEIVER_ADDRESS=0xYourWalletAddress npx hardhat run deploy.js --network mainnet

# Polygon
RECEIVER_ADDRESS=0xYourWalletAddress npx hardhat run deploy.js --network polygon

# Arbitrum
RECEIVER_ADDRESS=0xYourWalletAddress npx hardhat run deploy.js --network arbitrum

# Optimism
RECEIVER_ADDRESS=0xYourWalletAddress npx hardhat run deploy.js --network optimism

# Base
RECEIVER_ADDRESS=0xYourWalletAddress npx hardhat run deploy.js --network base
```

Replace `0xYourWalletAddress` with your actual receiving wallet address.

### 2. Update Contract Addresses in .env

After each deployment, add the new contract address to `.env`:

```properties
# Example after deploying to Polygon:
POLYGON_CHECKOUT_CONTRACT_ADDRESS=0x123abc...
```

### 3. Add Token Addresses to Frontend

For each network, add the USDC (or your token) address in `/frontend/checkout.js`:

```javascript
NETWORKS: {
  1: {
    name: "Ethereum",
    contractAddress: "0x...", // from deploy
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // Mainnet USDC
  },
  137: {
    name: "Polygon",
    contractAddress: "0x...", // from deploy
    tokenAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // Polygon USDC
  },
  // ... add more
}
```

### 4. Add Token Addresses to Backend Environment

Create a `/api/orders/token-config.js` if needed:

```javascript
// Token addresses per network for validation
export const TOKEN_ADDRESSES = {
  1: {
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  137: {
    USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  },
  // ...
};
```

### 5. Deploy Updated Code to Vercel

```bash
git add .
git commit -m "Deploy: Add contract addresses for all networks"
git push origin main
```

Vercel auto-deploys automatically!

## Testing the System

### Test on Testnet (Sepolia)

1. Get Sepolia ETH from [faucet](https://www.sepoliafaucet.io/)
2. Get Sepolia USDC: mint from mock contract at `0xda9d4f9b69ac3c4e622506ec7eda112601cb942d`
3. Visit your Vercel URL
4. Connect wallet (MetaMask, WalletConnect, etc.)
5. Pay with USDC

### Test on Mainnet

1. Get real ETH and USDC
2. Do the same as above
3. Real transactions happen!

## Common USDC Addresses

Add these to your network configs:

- **Ethereum**: `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`
- **Polygon**: `0x2791bca1f2de4661ed88a30c99a7a9449aa84174`
- **Arbitrum**: `0xff970a61a04b1ca14834a43f5de4533ebddb5f86`
- **Optimism**: `0x7f5c764cbc14f9669b88837ca1490cca17c31607`
- **Base**: `0x833589fCD6eDb6E08f4c7C32D4f71b1566469c18`

## Architecture

```
User connects wallet (any network)
    ↓
Frontend detects chain ID
    ↓
Frontend checks NETWORKS config
    ↓
Frontend sends payment signature + chainId
    ↓
Backend selects contract for that chainId
    ↓
Backend builds transaction
    ↓
User submits transaction
    ↓
Payment executed on chosen network!
```

## Future Improvements

- [ ] Add more networks (Linea, Manta, etc.)
- [ ] Batch deploy to multiple networks
- [ ] Liquidity bridging between networks
- [ ] Cross-chain settlement

## Troubleshooting

**"Contract not deployed on [Network]"**
- Run deployment script for that network
- Update .env with contract address
- Redeploy code to Vercel

**"Missing RPC configuration"**
- Check .env has RPC_URL for that network
- Verify Alchemy API key is valid

**"Payment token not configured"**
- Update NETWORKS in frontend checkout.js
- Add correct USDC address for that network

Everything is NOW ready to go! 🎉
