# ⚠️ RELAYER_PRIVATE_KEY Verification

## Current Status

The relayer key is **NOT** being found by the backend. This means payments are falling back to manual submission mode.

## Root Cause
`RELAYER_PRIVATE_KEY` environment variable is missing from Vercel deployment.

## How to Fix (Required for Payments to Work)

### Step 1: Go to Vercel Dashboard
https://vercel.com/dashboard

### Step 2: Select Your Project
- Project name: **files--4-** (or whatever your Vercel project is called)
- Note: The Vercel URL is `files-flax-xi.vercel.app`

### Step 3: Add Environment Variable
1. Click **Settings** (top navigation)
2. Click **Environment Variables** (left sidebar)
3. Click **Add New** button
4. Fill in:
   - **Name:** `RELAYER_PRIVATE_KEY`
   - **Value:** `f72a6758fd5d428ad2a2d0ce05832698b0b864f1d5093244f6ff20bd63244211`
   - **Environment:** Select all (Production, Preview, Development)
5. Click **Save**

### Step 4: Redeploy
Important! Just adding the env var won't activate it. You must redeploy:
- Option A: Git push (auto-deploy from main branch)
- Option B: Click **Deployments** → Select latest → Click menu → **Redeploy**

### Step 5: Wait for Deploy
Wait ~2-3 minutes for Vercel to redeploy with the new env var.

## Verification

After redeploy, when you visit https://files-flax-xi.vercel.app and make a payment:
- **If relayer key is SET:** You'll see "✅ Payment confirmed!" immediately
- **If relayer key is NOT SET:** You'll see "⚠️ Relayer not configured"

## What Each Key Component Does

| Component | Purpose | Status |
|-----------|---------|--------|
| Frontend Code | Collects signature from user | ✅ Working |
| Backend API | Processes payment | ✅ Code ready |
| Relayer Private Key | Submits transactions on-chain | ❌ **NOT IN VERCEL** |
| RPC URLs | Connects to blockchain | ✅ Hardcoded |

## When Relayer Key is Missing

Without the key, the flow is broken:
1. User signs ✅
2. Frontend sends to backend ✅
3. Backend receives signature ✅
4. Backend checks for RELAYER_PRIVATE_KEY ❌ NOT FOUND
5. Backend returns fallback (user must submit) ❌
6. No automatic transaction submission ❌
7. Payment fails ❌

## When Relayer Key is Present (After Fix)

With the key set correctly:
1. User signs ✅
2. Frontend sends to backend ✅
3. Backend receives signature ✅
4. Backend checks for RELAYER_PRIVATE_KEY ✅ FOUND
5. Backend creates transaction ✅
6. Backend submits with relayer wallet ✅
7. Relayer pays gas ✅
8. USDC arrives at receiver ✅
9. Success! ✅

## Relayer Wallet Details

- **Address:** 0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA
- **Current Balance:** 0.002 ETH on Mainnet
- **Role:** Signs & submits transactions (pays gas)
- **Funds:** ✅ Has gas (0.002 ETH = enough for ~20 transactions)

## Once You Add the Key

1. Verify at Vercel it shows under Environment Variables
2. Deploy/redeploy
3. Check https://files-flax-xi.vercel.app Vercel logs:
   - Should show: `Relayer Key Status: ✓ SET`
4. Try a payment
5. Should complete automatically!

## Still Having Issues?

Check Vercel Function Logs:
1. Go to Vercel Dashboard
2. Select your project
3. Click **Deployments** → Latest deploy
4. Click **Logs** tab
5. Look for "PAYMENT PROCESSING STARTED"
6. Check if it says `Relayer Key Status: ✓ SET` or `❌ NOT SET`

If it still says NOT SET even after adding the env var, you likely need to redeploy.
