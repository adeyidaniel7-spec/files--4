# 🚨 URGENT FIX - Render Build Override

## The Problem

Render is detecting the ROOT `package.json` and auto-running:
```
npm install; npm run build
```

This ignores your `render.yaml` buildCommand and doesn't install the server dependencies.

## The Solution (2 Minutes)

### Go to Render Dashboard and Override Build Command

1. **Open Render Dashboard:**
   https://dashboard.render.com/

2. **Select your service:**
   Click on `checkout-api`

3. **Go to Settings:**
   Click "Settings" in the left sidebar

4. **Scroll to "Build & Deploy":**
   Find the "Build Command" field

5. **Enter this EXACT command:**
   ```
   cd server && npm install --legacy-peer-deps
   ```

6. **Update "Start Command" to:**
   ```
   cd server && npm start
   ```

7. **Scroll down and click:**
   **"Save Changes"**

8. **Render will auto-redeploy** (~2-3 minutes)

---

## Why This Happens

Render auto-detects `package.json` in the root and runs the default Node.js build process. By setting the build command in the dashboard, you **override** this auto-detection.

---

## After You Save

You'll see in the logs:
```
==> Running build command 'cd server && npm install --legacy-peer-deps'
```

Then:
```
✅ Dependencies installed
🚀 Server starting
💾 Database connected
```

---

## Then Add Environment Variables

After the build succeeds, you still need to add the 9 environment variables (see RENDER_ENV_SETUP.md):

1. ETH_RELAYER_KEY
2. BASE_RELAYER_KEY
3. POLYGON_RELAYER_KEY
4. ARBITRUM_RELAYER_KEY
5. BNB_RELAYER_KEY
6. OPTIMISM_RELAYER_KEY
7. SOLANA_RELAYER_PUBKEY
8. TRON_RELAYER_KEY
9. TRON_RELAYER_ADDRESS

---

## Quick Action Checklist

- [ ] Open https://dashboard.render.com/
- [ ] Click `checkout-api` service
- [ ] Click "Settings"
- [ ] Set Build Command: `cd server && npm install --legacy-peer-deps`
- [ ] Set Start Command: `cd server && npm start`
- [ ] Click "Save Changes"
- [ ] Wait for redeploy (~2-3 min)
- [ ] Add environment variables (see RENDER_ENV_SETUP.md)
- [ ] Test: `curl https://checkout-api-wkyo.onrender.com/api/health`

---

## Timeline

**Right now:** Override build command in dashboard (2 min)
  ↓
**+3 min:** Build succeeds, deployment starts
  ↓
**Then:** Add 9 environment variables (5 min)
  ↓
**+2 min:** Auto-redeploys with env vars
  ↓
**LIVE!** Test the API and celebrate! 🎉

---

**Total time: ~12 minutes to fully operational**
