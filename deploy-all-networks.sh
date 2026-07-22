#!/bin/bash
# Multi-Network Deployment Script
# Deploy to all networks at once (requires sufficient gas fees on each)

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy-all-networks.sh <RECEIVER_ADDRESS>"
    echo "Example: ./deploy-all-networks.sh 0xc200b8d056bc579c62f53d6832e50f066e98f0af"
    exit 1
fi

RECEIVER_ADDRESS=$1

echo "🚀 Multi-Network Deployment Starting..."
echo "Receiver Address: $RECEIVER_ADDRESS"
echo ""

# Deploy to Sepolia Testnet
echo "📡 Deploying to Sepolia Testnet (chain 11155111)..."
RECEIVER_ADDRESS=$RECEIVER_ADDRESS npx hardhat run deploy.js --network sepolia
echo "✅ Sepolia deployment complete!"
echo ""

# Deploy to Ethereum Mainnet (uncomment when ready and funded)
# echo "📡 Deploying to Ethereum Mainnet (chain 1)..."
# RECEIVER_ADDRESS=$RECEIVER_ADDRESS npx hardhat run deploy.js --network mainnet
# echo "✅ Ethereum deployment complete!"
# echo ""

# Deploy to Polygon (uncomment when ready and funded)
# echo "📡 Deploying to Polygon (chain 137)..."
# RECEIVER_ADDRESS=$RECEIVER_ADDRESS npx hardhat run deploy.js --network polygon
# echo "✅ Polygon deployment complete!"
# echo ""

# Deploy to Arbitrum (uncomment when ready and funded)
# echo "📡 Deploying to Arbitrum (chain 42161)..."
# RECEIVER_ADDRESS=$RECEIVER_ADDRESS npx hardhat run deploy.js --network arbitrum
# echo "✅ Arbitrum deployment complete!"
# echo ""

# Deploy to Optimism (uncomment when ready and funded)
# echo "📡 Deploying to Optimism (chain 10)..."
# RECEIVER_ADDRESS=$RECEIVER_ADDRESS npx hardhat run deploy.js --network optimism
# echo "✅ Optimism deployment complete!"
# echo ""

# Deploy to Base (uncomment when ready and funded)
# echo "📡 Deploying to Base (chain 8453)..."
# RECEIVER_ADDRESS=$RECEIVER_ADDRESS npx hardhat run deploy.js --network base
# echo "✅ Base deployment complete!"
# echo ""

echo "🎉 All deployments complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with new contract addresses from deployment logs"
echo "2. Update /frontend/checkout.js with contract addresses"
echo "3. Add token addresses for each network"
echo "4. git add . && git commit && git push"
echo "5. Vercel will auto-deploy!"
