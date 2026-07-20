# Express Backend Setup Guide

## Installation

```bash
npm install express cors dotenv ethers
```

## File Structure

```
/Users/mac/Downloads/files (4)/
├── app.js                    # Main Express app (NEW)
├── checkoutBackend.js        # Quote & verification endpoints
├── checkoutRelayer.js        # Payment relaying endpoint (NEW)
├── .env.example              # Environment variables template (NEW)
├── .env                       # Your actual secrets (don't commit)
└── package.json
```

## Setup Steps

### 1. Create `.env` file

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your actual values:
```env
PORT=3000
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CHECKOUT_CONTRACT_ADDRESS=0xc200b8d056bc579c62f53d6832e50f066e98f0af
ADMIN_PRIVATE_KEY=0x_YOUR_ADMIN_WALLET_PRIVATE_KEY_
```

### 2. Get Admin Private Key

You need a wallet to act as the relayer (pays gas):

**Option A: Use existing wallet**
```bash
# In MetaMask: Settings → Account Details → Export Private Key
# Copy and paste into ADMIN_PRIVATE_KEY in .env
```

**Option B: Create new wallet for relayer**
```bash
# Using ethers.js CLI or similar tool
# Make sure wallet has ETH on Sepolia testnet for gas
```

**⚠️ SECURITY: Never commit `.env` to git**

Add to `.gitignore`:
```
.env
.env.local
```

### 3. Run the backend

```bash
node app.js
```

Expected output:
```
✓ Express app running on port 3000
✓ Checkout backend mounted
✓ Checkout relayer mounted

Endpoints:
  POST /api/orders/execute-payment (relayer - gasless)
  GET  /api/orders/:orderId/checkout-quote (backend)
  POST /api/orders/:orderId/confirm (backend)
```

### 4. Test the health endpoint

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","relayer":"active"}
```

## How It Works

### Frontend sends signature to relayer:
```javascript
POST /api/orders/execute-payment

{
  "userAddress": "0x1234...",
  "tokenAddress": "0xda9d...",
  "amount": "500000000",      // 500 USDC in wei
  "nonce": "12345...",
  "deadline": 1721415600,
  "signature": "0xabcd..."
}
```

### Backend relayer:
1. Receives signature from frontend
2. Encodes `pay()` function call with signature
3. Admin wallet sends transaction (pays gas)
4. Returns txHash to frontend
5. Frontend polls for confirmation

### Result:
- User only signs once (no gas payment)
- Admin pays gas fee
- Tokens transfer from user → merchant

## Admin Wallet Requirements

- [ ] Has private key set in ADMIN_PRIVATE_KEY
- [ ] Has ETH on Sepolia testnet (for gas)
- [ ] Is NOT the same as user/merchant addresses (optional but recommended)

Get testnet ETH:
- Sepolia Faucet: https://sepoliafaucet.com

## Troubleshooting

### Error: "ADMIN_PRIVATE_KEY not set"
- Check `.env` file exists
- Check `ADMIN_PRIVATE_KEY` is in the file
- Make sure it starts with `0x` and is valid hex

### Error: "Insufficient funds for gas"
- Admin wallet needs ETH on Sepolia
- Go to faucet and request test ETH

### Error: "Transaction execution reverted"
- Check signature format matches contract expectations
- Verify amount has correct decimals
- Check deadline hasn't expired

### Frontend can't reach backend
- Make sure backend is running on correct port
- Check CORS configuration (already enabled in app.js)
- Verify frontend has correct backend URL

## Production Deployment

For production, follow these security practices:

1. **Private Key Management**
   - Use AWS Secrets Manager, Google Secret Manager, or similar
   - Never put private key in .env files on production servers
   - Use IAM roles for automatic key rotation

2. **Rate Limiting**
   - Add rate limiting to /execute-payment endpoint
   - Prevent spam/DoS attacks

3. **Monitoring**
   - Log all payment attempts
   - Alert on failed transactions
   - Monitor admin wallet balance

4. **Gas Optimization**
   - Implement transaction batching for high volume
   - Use gas price optimization services
   - Track and optimize relayer costs

5. **Backup**
   - Backup admin wallet seed phrase securely
   - Test recovery procedures

## Next Steps

1. ✅ Backend is set up
2. ✅ Frontend already updated (checkout.js)
3. ⏭️ Test end-to-end flow:
   - Start backend: `node app.js`
   - Open frontend on phone
   - Connect wallet
   - Sign and submit payment
   - Check backend logs

4. ⏭️ Monitor transaction on Sepolia etherscan:
   - https://sepolia.etherscan.io
   - Search for your contract address
   - Verify PaymentReceived events
