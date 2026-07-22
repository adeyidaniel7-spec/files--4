# Deployment Guide - Updated Contract with Relayer Support

## Changes Made

### 1. **Smart Contract Updated**
- Added `payFromRelayer()` function that allows admin to pay gas
- Added `admin` state variable (initialized to deployer)
- Added `setAdmin()` to update relayer address
- **Old `pay()` function still works** for backward compatibility

### 2. **Backend API Updated**
- Now calls `payFromRelayer(owner, token, amount, nonce, deadline, signature)`
- Admin wallet (`ADMIN_PRIVATE_KEY`) pays all gas
- User gets gasless experience

---

## Deployment Steps

### Step 1: Recompile Contract
```bash
cd "/Users/mac/Downloads/files (4)"
npx hardhat compile
```

### Step 2: Deploy New Contract to Sepolia
```bash
RECEIVER_ADDRESS=0xYourReceiverWallet \
npx hardhat run deploy.js --network sepolia
```

Or use this receiver (your merchant address):
```bash
RECEIVER_ADDRESS=0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA \
npx hardhat run deploy.js --network sepolia
```

**You'll get a new contract address. Save it!**

### Step 3: Update Environment Variables

In Vercel Dashboard:
- Go to **Settings → Environment Variables**
- Update `CHECKOUT_CONTRACT_ADDRESS` to the new contract address
- Keep `ADMIN_PRIVATE_KEY` and `RPC_URL` the same

### Step 4: Push Changes
```bash
git add . && git commit -m "Add relayer support to contract" && git push origin main
```

Vercel will auto-redeploy with the new backend code.

---

## How It Works Now

### User Flow (Gasless)
1. ✅ User opens checkout page
2. ✅ User signs Permit2 message (in their wallet)
3. ✅ Frontend sends signed message to backend
4. ✅ **Admin wallet submits transaction** (admin pays gas)
5. ✅ Transfer executes seamlessly

### Who Pays What
- **Gas fee**: Admin wallet (`ADMIN_PRIVATE_KEY`)
- **Token transfer**: User's tokens go to receiver
- **User cost**: $0 (completely gasless!)

---

## Verification

### Check Admin Wallet Balance
https://sepolia.etherscan.io/address/0x79813dAc1288FbC0c3E629cFA18682Fd633b2FbA

If low on ETH:
1. Get Sepolia testnet ETH from faucet
2. Send to admin wallet

### Check Contract Status
Once deployed, verify on Etherscan:
```
https://sepolia.etherscan.io/address/NEW_CONTRACT_ADDRESS
```

---

## Testing

1. Deploy contract
2. Update `CHECKOUT_CONTRACT_ADDRESS` in Vercel
3. Open your Vercel URL
4. Test payment flow
5. Check Vercel logs for "GASLESS PAYMENT RELAYING STARTED"

✅ If transaction succeeds, gas was paid by admin!
