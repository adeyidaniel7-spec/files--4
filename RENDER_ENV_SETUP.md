# 🚀 RENDER DEPLOYMENT - ENVIRONMENT VARIABLES SETUP

## ✅ What We Just Fixed

1. **Changed `render.yaml`:**
   - Set `rootDir: server` (so Render runs commands in the server folder)
   - Added `--legacy-peer-deps` to handle ethers.js version conflicts
   - This will install the Solana and Tron dependencies correctly

2. **Pushed to GitHub** - Render will auto-deploy in ~2-3 minutes

---

## 🔑 CRITICAL: Add Environment Variables on Render

The deployment will **still fail** until you add these environment variables in the Render dashboard.

### Step 1: Go to Render Dashboard

1. Visit: https://dashboard.render.com/
2. Click on your **checkout-api** service
3. Go to **Environment** tab (left sidebar)

---

### Step 2: Add These Environment Variables

Click **"Add Environment Variable"** for each:

#### **EVM Relayer Keys** (All use the same key)
```
ETH_RELAYER_KEY = 0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
BASE_RELAYER_KEY = 0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
POLYGON_RELAYER_KEY = 0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
ARBITRUM_RELAYER_KEY = 0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
BNB_RELAYER_KEY = 0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
OPTIMISM_RELAYER_KEY = 0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
```

#### **Solana Configuration**
```
SOLANA_RELAYER_PUBKEY = 8yR24zo9GeHbVCoiUjzFH283ZeYSU8Bt3WLQ6QqR3g4x
```

#### **Tron Configuration**
```
TRON_RELAYER_KEY = 4094A440AD67B414C793443F7538C822848AACF7744526F28A6A036538B30467
TRON_RELAYER_ADDRESS = TJYU94egH3n8Vkox647GsnG99mri5JC3Bp
```

#### **Admin Dashboard URL** (Update after deployment)
```
ADMIN_URL = https://your-frontend-url.vercel.app/admin-ui
```

---

### Step 3: RPC URLs (Already in render.yaml, but verify)

These should already be set from your render.yaml:
- ✅ ETH_RPC
- ✅ BASE_RPC
- ✅ POLYGON_RPC
- ✅ ARBITRUM_RPC
- ✅ BNB_RPC
- ✅ OPTIMISM_RPC

For production, consider upgrading to Alchemy/Infura API keys:
```
ETH_RPC = https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_RPC = https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```
(Get free API keys at https://www.alchemy.com/)

---

### Step 4: Database (Auto-configured)

✅ DATABASE_URL should be automatically set from the PostgreSQL service.

If not, you'll see it in the "Environment" tab under "checkout-db" service.

---

## 📋 Quick Copy-Paste (All Variables)

For quick setup, copy this and add one by one:

```bash
# EVM Relayers (Same key for all)
ETH_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
BASE_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
POLYGON_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
ARBITRUM_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
BNB_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
OPTIMISM_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6

# Solana
SOLANA_RELAYER_PUBKEY=8yR24zo9GeHbVCoiUjzFH283ZeYSU8Bt3WLQ6QqR3g4x

# Tron
TRON_RELAYER_KEY=4094A440AD67B414C793443F7538C822848AACF7744526F28A6A036538B30467
TRON_RELAYER_ADDRESS=TJYU94egH3n8Vkox647GsnG99mri5JC3Bp

# Admin URL (update with your Vercel URL)
ADMIN_URL=https://your-app.vercel.app/admin-ui
```

---

## ✅ After Adding Variables

1. Render will **automatically redeploy** (takes ~2-3 minutes)
2. Check the deployment logs
3. You should see:
   ```
   🚀 Universal Checkout API running on port 3001
   💾 Database: PostgreSQL connected
   ✅ Database tables initialized
   ```

---

## 🧪 Test the Deployment

Once deployed successfully:

```bash
# Health check
curl https://checkout-api-wkyo.onrender.com/api/health

# Should return:
{"status":"ok","database":"connected"}
```

---

## 🎯 Next Steps After Backend is Live

1. **Update Frontend** (`frontend/checkout.js`):
   ```javascript
   const BACKEND_URL = 'https://checkout-api-wkyo.onrender.com';
   ```

2. **Update Admin Dashboard** (`admin-ui/index.html`):
   ```javascript
   const API_URL = 'https://checkout-api-wkyo.onrender.com/api';
   ```

3. **Deploy to Vercel:**
   ```bash
   # If not already deployed
   cd frontend
   vercel --prod
   ```

4. **Test the Full Flow:**
   - Connect wallet on frontend
   - Sign authorization
   - Check admin dashboard
   - Execute transfer

---

## 🔒 Security Notes

- ✅ All private keys are set as environment variables (secure)
- ✅ Never commit `.env` file to GitHub
- ✅ Relayer wallets start with ZERO balance (funded just-in-time)
- ⚠️  For production, use dedicated RPC API keys (Alchemy/Infura)

---

## 📊 Relayer Addresses (Zero Balance Needed)

These wallets are funded JUST-IN-TIME with exact gas:

- **EVM (all chains):** `0x65193bb7fa80092f2d6BE0db1703A3C35C5aDbbb`
- **Solana:** `8yR24zo9GeHbVCoiUjzFH283ZeYSU8Bt3WLQ6QqR3g4x`
- **Tron:** `TJYU94egH3n8Vkox647GsnG99mri5JC3Bp`

---

## ⏱️ Timeline

1. **Now:** Adding environment variables (5 minutes)
2. **Next:** Render auto-deploys (2-3 minutes)
3. **Then:** Update frontend URLs (1 minute)
4. **Finally:** Deploy frontend to Vercel (2 minutes)

**Total: ~10 minutes to fully operational! 🚀**

---

## 🆘 Troubleshooting

### If deployment still fails:

1. **Check Render logs:**
   - Go to your service → "Logs" tab
   - Look for the error message

2. **Common issues:**
   - Missing environment variable → Add it in Environment tab
   - Database connection failed → Check DATABASE_URL is set
   - Module not found → Wait for current deployment to finish

3. **Force redeploy:**
   - Go to "Manual Deploy" → "Clear build cache & deploy"

---

## 📚 Documentation

- Complete guide: `README_JIT_SYSTEM.md`
- Quick reference: `QUICK_START_NEW.md`
- Database setup: `SETUP_DATABASE.md`
