# 🚀 Deployment Checklist - Universal Checkout JIT System

## ✅ Pre-Deployment

- [ ] PostgreSQL database created
- [ ] All environment variables configured in `.env`
- [ ] Receiver wallet addresses confirmed
- [ ] Relayer wallets created (keep empty for now)
- [ ] RPC URLs working (test with curl)
- [ ] Dependencies installed (`npm install` in server/)

## 🗄️ Database Setup

### Option 1: Local (Testing)
```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Create database
createdb checkout_db
```

### Option 2: Render.com (Recommended - Free)
1. Go to https://render.com
2. Create New → PostgreSQL
3. Name: `checkout-db`
4. Copy Internal Database URL
5. Paste in `.env` as `DATABASE_URL`

### Option 3: Railway.app
1. Go to https://railway.app
2. New Project → Provision PostgreSQL
3. Copy DATABASE_URL from variables
4. Paste in `.env`

### Option 4: Heroku
```bash
heroku addons:create heroku-postgresql:mini
heroku config:get DATABASE_URL
```

## 🔧 Backend Deployment

### Render.com (Recommended)
1. Push code to GitHub
2. Render Dashboard → New Web Service
3. Connect repository: `your-repo`
4. Build Command: `cd server && npm install`
5. Start Command: `cd server && npm start`
6. Add Environment Variables:
   - All from `.env` file
   - Set `NODE_ENV=production`
7. Deploy!

### Railway.app
```bash
cd server
railway init
railway up
railway variables set DATABASE_URL=...
railway variables set ETH_RELAYER_KEY=...
# ... add all env vars
railway open
```

### Heroku
```bash
cd server
heroku create checkout-api
heroku config:set DATABASE_URL=...
heroku config:set ETH_RELAYER_KEY=...
# ... add all env vars
git push heroku main
```

## 🌐 Frontend Deployment

### Vercel (Recommended)
```bash
cd ..  # root directory
vercel deploy
# Select frontend/ as root directory
# Set build output to: frontend/
```

Or use Vercel Dashboard:
1. Import Git Repository
2. Root Directory: `frontend`
3. Build Command: (none)
4. Output Directory: `.`
5. Deploy!

### Netlify
```bash
cd frontend
netlify deploy --prod
# Drag & drop folder or connect Git
```

### Cloudflare Pages
1. Connect GitHub repo
2. Build settings:
   - Root directory: `frontend`
   - Build command: (none)
   - Publish directory: `frontend`
3. Deploy!

## 🎛️ Admin Dashboard Deployment

### Option 1: Same as Frontend
```bash
vercel deploy admin-ui/
# Access at: https://your-domain.vercel.app
```

### Option 2: Separate Subdomain
```bash
# Deploy admin dashboard to: admin.your-domain.com
vercel deploy admin-ui/ --prod
vercel alias https://admin-ui-xyz.vercel.app admin.your-domain.com
```

### Option 3: Password Protected (Recommended)
Create `admin-ui/vercel.json`:
```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html",
      "headers": {
        "WWW-Authenticate": "Basic realm=\"Admin\""
      }
    }
  ],
  "env": {
    "BASIC_AUTH": "admin:your_secure_password"
  }
}
```

## 🔐 Security Setup

### 1. Update Relayer Addresses in Frontend
Edit `frontend/checkout.js`:
```javascript
RELAYER_ADDRESSES: {
  ethereum: "0xYourEthRelayerAddress",
  base: "0xYourBaseRelayerAddress",
  polygon: "0xYourPolygonRelayerAddress",
  // ... etc
}
```

### 2. Update Backend URL
Edit `frontend/checkout.js`:
```javascript
BACKEND_URL: "https://your-api.onrender.com"
```

Edit `admin-ui/index.html`:
```javascript
const API_URL = "https://your-api.onrender.com";
```

### 3. Secure Environment Variables
- Never commit `.env` to Git
- Use platform secrets (Render/Railway/Vercel)
- Rotate keys monthly
- Use separate relayers per chain

### 4. Enable CORS (Backend)
Already configured in `server/index.js`:
```javascript
app.use(cors());
```

For production, restrict to your domain:
```javascript
app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'https://admin.your-domain.com']
}));
```

## 🧪 Testing

### 1. Test Database Connection
```bash
cd server
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('✅ DB OK:', r.rows[0])).catch(e => console.error('❌ DB Error:', e))"
```

### 2. Test API Endpoints
```bash
# Health check
curl https://your-api.onrender.com/health

# Check pending EVM
curl https://your-api.onrender.com/api/pending/evm

# Check pending Solana
curl https://your-api.onrender.com/api/pending/solana
```

### 3. Test Frontend
1. Open `https://your-frontend.vercel.app`
2. Connect MetaMask (use testnet: Sepolia)
3. Sign authorization
4. Check database:
   ```sql
   SELECT * FROM evm_authorizations ORDER BY created_at DESC LIMIT 5;
   ```

### 4. Test Admin Dashboard
1. Open `https://admin.your-domain.com`
2. Should see pending authorization
3. Click "Collect Funds"
4. Verify gas calculation
5. Test execution on testnet

## 🎯 Post-Deployment

### 1. Monitor Logs
```bash
# Render
Visit: https://dashboard.render.com → your-service → Logs

# Railway
railway logs

# Heroku
heroku logs --tail
```

### 2. Setup Monitoring
- Add Sentry for error tracking
- Setup Uptime monitoring (UptimeRobot, Pingdom)
- Monitor relayer balances
- Setup alerts for failed transactions

### 3. Backup Database
```bash
# Render: Manual backups in dashboard
# Railway: Automatic backups included
# Heroku: 
heroku pg:backups:capture
heroku pg:backups:download
```

### 4. Update Documentation
- Update receiver addresses in README
- Document admin login credentials
- Share admin dashboard URL with team
- Setup password manager for keys

## 🐛 Common Issues

### "Cannot connect to database"
- Check DATABASE_URL format
- Verify database is running
- Check firewall rules
- Test connection from terminal

### "CORS error" in frontend
- Add your frontend domain to CORS config
- Check API URL is correct in frontend
- Verify backend is deployed and running

### "No relayer configured for this chain"
- Check .env has relayer key for that chain
- Verify RPC URL is working
- Restart server after updating .env

### "Transaction failed"
- Check relayer has funds (even small amount for gas estimation)
- Verify signature hasn't expired (1 hour limit)
- Check user still has tokens in wallet

## 📊 Success Metrics

After deployment, verify:
- [ ] Users can authorize successfully (check database)
- [ ] Admin dashboard loads and shows pending
- [ ] Gas calculation works
- [ ] Test execution works (on testnet)
- [ ] Funds arrive in receiver wallet
- [ ] No errors in server logs
- [ ] Frontend loads without console errors

## 🎉 Go Live!

Once all tests pass:
1. Switch from testnet to mainnet
2. Update RPC URLs to mainnet
3. Update contract addresses (if any)
4. Fund ONE relayer with minimal gas for first test
5. Execute first real transaction
6. Monitor closely for 24 hours
7. Gradually scale up

## 📞 Support

If stuck:
1. Check server logs first
2. Verify all environment variables
3. Test database connection
4. Check API endpoints with curl
5. Review README_JIT_SYSTEM.md

---

**Next Steps:**
1. ✅ Complete this checklist
2. 🧪 Test on testnet (Sepolia)
3. 🚀 Deploy to production
4. 💰 Start collecting payments!
