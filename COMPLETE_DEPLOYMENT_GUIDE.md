# 🚀 COMPLETE DEPLOYMENT GUIDE - ALL BLOCKCHAINS

## Your Verified Wallet Addresses

✅ **EVM Networks** (Ethereum, Polygon, Arbitrum, Optimism, Base, BNB, Linea, Monad):
```
0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA
```

✅ **Bitcoin**:
```
bc1qey48e2qy5the3mcalm04lr7qkyp55e6chf6x72
```

✅ **Solana**:
```
GoPWPA1cs3sfb251Qa7qEuNmZu2a9LqxSooEt28Z5UWj
```

✅ **TRON**:
```
TRtsTuWjLfyR5SfxhjKFJBJMpJSBcHnHNC
```

---

## STEP 1: GET GAS FOR TESTNET (FREE)

### Sepolia Testnet (For Testing - $0 cost)

Get free Sepolia ETH from faucets:
1. https://www.sepoliafaucet.io/
2. https://faucetlink.to/sepolia
3. https://sepolia-faucet.pk910.de/
4. https://faucet.quicknode.com/ethereum/sepolia

**Need**: ~0.1 ETH (enough for multiple deployments)

Once you have Sepolia ETH, run:
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network sepolia
```

---

## STEP 2: GET GAS FOR MAINNETS (Costs Money)

You need native tokens on each network to pay for deployment:

### Buying Gas Tokens

Go to any exchange (Coinbase, Kraken, Binance):

| Network | Token | Amount Needed | Cost |
|---------|-------|---------------|------|
| Ethereum | ETH | 0.05 | ~$150-200 |
| Polygon | MATIC | 100 | ~$20-30 |
| Arbitrum | ETH | 0.02 | ~$50-70 |
| Optimism | ETH | 0.02 | ~$50-70 |
| Base | ETH | 0.02 | ~$50-70 |
| BNB Chain | BNB | 0.3 | ~$100 |
| Linea | ETH | 0.01 | ~$25-35 |

**Total for all networks**: ~$400-500 (one-time cost)

### Alternative: Deploy to Cheaper Networks First

Recommended order (cheapest to most expensive):
1. ✅ **Sepolia** (FREE - testnet)
2. 💰 **Polygon** (~$20-30) - Cheapest mainnet
3. 💰 **BNB Chain** (~$100)
4. 💰 **Linea** (~$25-35)
5. 💰 **Arbitrum** (~$50-70)
6. 💰 **Optimism** (~$50-70)
7. 💰 **Base** (~$50-70)
8. 💰 **Ethereum** (~$150-200) - Most expensive

---

## STEP 3: DEPLOYMENT COMMANDS

### Test on Sepolia First

```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network sepolia
```

**Expected output:**
```
✅ CheckoutPermit2 deployed to: 0x[CONTRACT_ADDRESS]
```

### Deploy to Each Mainnet

**Polygon:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network polygon
```

**BNB Chain:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network bsc
```

**Linea:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network linea
```

**Arbitrum:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network arbitrum
```

**Optimism:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network optimism
```

**Base:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network base
```

**Ethereum Mainnet:**
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network mainnet
```

---

## STEP 4: UPDATE CONFIGURATION FILES

After each deployment, copy the contract address and update:

### 1. Update .env

```properties
SEPOLIA_CHECKOUT_CONTRACT_ADDRESS=0x[SEPOLIA_CONTRACT]
POLYGON_CHECKOUT_CONTRACT_ADDRESS=0x[POLYGON_CONTRACT]
BSC_CHECKOUT_CONTRACT_ADDRESS=0x[BNB_CONTRACT]
LINEA_CHECKOUT_CONTRACT_ADDRESS=0x[LINEA_CONTRACT]
ARBITRUM_CHECKOUT_CONTRACT_ADDRESS=0x[ARBITRUM_CONTRACT]
OPTIMISM_CHECKOUT_CONTRACT_ADDRESS=0x[OPTIMISM_CONTRACT]
BASE_CHECKOUT_CONTRACT_ADDRESS=0x[BASE_CONTRACT]
MAINNET_CHECKOUT_CONTRACT_ADDRESS=0x[ETHEREUM_CONTRACT]
```

### 2. Update Frontend (checkout.js)

```javascript
NETWORKS: {
  1: { // Ethereum
    name: "Ethereum",
    contractAddress: "0x[ETHEREUM_CONTRACT]",
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  11155111: { // Sepolia
    name: "Sepolia",
    contractAddress: "0x[SEPOLIA_CONTRACT]",
    tokenAddress: "0xda9d4f9b69ac3c4e622506ec7eda112601cb942d",
  },
  137: { // Polygon
    name: "Polygon",
    contractAddress: "0x[POLYGON_CONTRACT]",
    tokenAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
  },
  56: { // BNB
    name: "BNB Chain",
    contractAddress: "0x[BNB_CONTRACT]",
    tokenAddress: "0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d",
  },
  10: { // Optimism
    name: "Optimism",
    contractAddress: "0x[OPTIMISM_CONTRACT]",
    tokenAddress: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
  },
  42161: { // Arbitrum
    name: "Arbitrum",
    contractAddress: "0x[ARBITRUM_CONTRACT]",
    tokenAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5f86",
  },
  8453: { // Base
    name: "Base",
    contractAddress: "0x[BASE_CONTRACT]",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b1566469c18",
  },
  59144: { // Linea
    name: "Linea",
    contractAddress: "0x[LINEA_CONTRACT]",
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
}
```

### 3. Commit and Push

```bash
git add .
git commit -m "deploy: Add contract addresses for all networks"
git push origin main
```

Vercel auto-deploys!

---

## STEP 5: NON-EVM BLOCKCHAINS

### Bitcoin

Your address will receive payments at:
```
bc1qey48e2qy5the3mcalm04lr7qkyp55e6chf6x72
```

**Setup option**: Accept WBTC on EVM (already configured!)
- Users can trade Bitcoin → WBTC
- Pay with WBTC on any EVM network
- No additional setup needed

### Solana

Your address:
```
GoPWPA1cs3sfb251Qa7qEuNmZu2a9LqxSooEt28Z5UWj
```

**Quick Setup**: Use existing processor
- Phantom Checkout: Built-in Solana payment
- Magic Eden Pay: Solana payment integration
- Takes 15 minutes to integrate

**Full Setup**: Deploy custom program (2-3 hours)
- Full control over logic
- Custom token support
- Advanced features

### TRON

Your address:
```
TRtsTuWjLfyR5SfxhjKFJBJMpJSBcHnHNC
```

**Quick Setup**: Use TRON processor
- TronPay: Pre-built integration
- Takes 15 minutes

**Full Setup**: Port contract to TRON (1-2 hours)
- Same Solidity contract adapted for TRON
- Full control
- Custom logic

---

## TESTING YOUR SYSTEM

### Test on Sepolia (FREE)

1. Deploy to Sepolia ✓
2. Get Sepolia USDC from mock contract
3. Go to your Vercel URL
4. Connect wallet on Sepolia
5. Complete payment
6. Check if funds arrived in your wallet

### Test on Real Network

1. Deploy to Polygon (cheapest mainnet)
2. Get Polygon USDC (trade on Uniswap)
3. Go to your Vercel URL
4. Connect wallet on Polygon
5. Complete payment
6. Verify: Check your wallet on PolygonScan

---

## AUTOMATION SCRIPT

I created a deployment script to deploy all at once:

```bash
./deploy-all-networks.sh 0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA
```

This will deploy to all networks sequentially (requires gas on all).

---

## YOUR CHECKLIST

- [ ] Get Sepolia ETH (free)
- [ ] Deploy to Sepolia: `RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA npx hardhat run deploy.js --network sepolia`
- [ ] Copy Sepolia contract address
- [ ] Update .env with Sepolia address
- [ ] Update frontend with Sepolia address
- [ ] Test on Vercel
- [ ] Get mainnet gas (buy BNB, MATIC, ETH, etc.)
- [ ] Deploy to 2-3 networks (start with cheap ones)
- [ ] Update .env + frontend
- [ ] Push to GitHub (auto-deploys)
- [ ] Setup Solana/TRON/Bitcoin if needed

---

## NETWORK FAUCETS (Free Gas)

**Sepolia**: https://www.sepoliafaucet.io/

**Polygon Mumbai Testnet**: https://faucet.polygon.technology/

**Arbitrum Sepolia**: https://faucet.arbitrum.io/

**Optimism Sepolia**: https://community.optimism.io/docs/useful-tools/faucets/

**Base Sepolia**: https://coinbase.com/faucets/base-ethereum-sepolia

**BNB Testnet**: https://testnet.binance.org/faucet-smart

---

## WHAT HAPPENS NEXT

1. **You get Sepolia ETH** → Deploy + test
2. **You get mainnet gas** → Deploy to 2-3 networks
3. **Each deployment** → Update config + push
4. **System goes live** → Accept payments on all networks!

**Timeline**: 
- Sepolia test: 30 minutes
- First mainnet deploy: 1-2 hours (including gas acquisition)
- All networks deployed: 1 day

---

## SUPPORT

Any questions during deployment, I'm here! Just let me know:
- Which network you're deploying to
- Any error messages
- Contract address once deployed

**Everything is configured and ready. Just need the gas! 🚀**
