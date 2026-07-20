# Gasless Checkout Flow (Admin Pays Gas)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GASLESS CHECKOUT FLOW                         │
└─────────────────────────────────────────────────────────────────┘

USER DEVICE (Frontend)                BLOCKCHAIN
──────────────────────                ──────────
1. Connect wallet
   ↓
2. Sign message (Permit2)
   ✓ No gas cost
   ✓ Just cryptographic proof
   ↓
3. Send signature to backend
   {
     userAddress,
     tokenAddress,
     amount,
     nonce,
     deadline,
     signature
   }
   ↓
                               BACKEND (Admin Relayer)
                               ───────────────────────
                               4. Receive signature
                               5. Encode pay() call with signature
                               6. Send transaction
                                  FROM: Admin wallet
                                  TO: Contract
                                  (Admin pays gas in ETH)
                               7. Return txHash to frontend
   ↓
8. Poll provider for confirmation
   Checks: getTransactionReceipt(txHash)
   ↓
9. Show "Payment confirmed!"
```

## Key Changes

### Frontend (checkout.js)
- ✅ Still signs Permit2 message (no change here)
- ❌ Does NOT send transaction directly
- ✅ Sends signature to backend: `POST /api/orders/execute-payment`
- ✅ Polls for confirmation instead of awaiting tx.wait()

### Backend (checkoutRelayer.js)
- ✅ New endpoint receives signed message
- ✅ Admin wallet sends transaction (admin pays gas)
- ✅ Contract receives signature + executes transfer
- ✅ Returns txHash for frontend to track

## User Experience

```
Before (User Pays Gas):
  Step 1: "Sign message?" → User clicks Sign
  Step 2: "Confirm transaction?" → User clicks Confirm (pays gas)
  ❌ 2 wallet prompts

After (Admin Pays Gas):
  Step 1: "Sign message?" → User clicks Sign
  ✅ Only 1 wallet prompt (no gas payment from user)
```

## Security Notes

1. **Signature Verification**
   - Contract verifies signature matches Permit2 format
   - Contract confirms signer == user making payment
   - Even though admin relays, user's signature proves authorization

2. **Nonce Protection**
   - Same Permit2 nonce bitmap scheme
   - Prevents replay attacks
   - Each signature is tied to specific nonce

3. **Admin Key Protection**
   - Store ADMIN_PRIVATE_KEY in `.env` file only
   - Never commit to git
   - Use secure key management in production

## Environment Setup

Add to your backend `.env`:
```
ADMIN_PRIVATE_KEY=0x...  # Admin wallet private key (hex format)
RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CHECKOUT_CONTRACT_ADDRESS=0xc200b8d056bc579c62f53d6832e50f066e98f0af
```

## Integration

1. **Mount router in Express app**:
   ```javascript
   const checkoutRelayer = require('./checkoutRelayer');
   app.use('/', checkoutRelayer);
   ```

2. **Frontend is already updated** to call this endpoint

3. **Contract behavior unchanged** - still expects same pay() signature

## Gas Cost Flow

```
User's USDC: 500 USDC → Pay 500 USDC to merchant ✓
Admin pays: X gas (ETH) to relay the transaction
Merchant receives: 500 USDC

Total cost to user: Just 500 USDC (no gas)
Total cost to admin: Gas fee in ETH (for relay)
```

## Testing Locally

1. Start backend with relayer:
   ```bash
   node app.js  # Make sure checkoutRelayer is mounted
   ```

2. Frontend will:
   - Sign message (wallet prompt)
   - Send to `/api/orders/execute-payment`
   - Poll for confirmation
   - Show success

3. Watch backend logs for "Transaction sent: 0x..."

## Production Considerations

- [ ] Admin private key in secure vault (not .env)
- [ ] Rate limiting on /execute-payment endpoint
- [ ] Track relayer transactions and costs
- [ ] Implement gas price optimization
- [ ] Monitor admin wallet ETH balance
- [ ] Add transaction batching if high volume
