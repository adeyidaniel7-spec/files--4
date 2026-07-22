# 🔗 NON-EVM BLOCKCHAIN INTEGRATION GUIDE

## ⚠️ Important: These Need Different Architecture

Bitcoin, Solana, and TRON don't use Permit2 or traditional EVM contracts. They need custom backends.

---

## 🪙 BITCOIN Integration Options

### Option 1: Accept Bitcoin Via WBTC (RECOMMENDED - Easiest)
Wrap Bitcoin to WBTC on Ethereum, then users pay with WBTC on any EVM chain.

**Pros:**
- ✅ Use existing checkout system
- ✅ No new backend needed
- ✅ Works on all EVM networks
- ✅ Users can bridge WBTC anywhere

**Cons:**
- ⚠️ Requires wrapping (custody risk)
- ⚠️ Users need EVM wallet + gas

**Setup:**
```javascript
// Add to frontend CONFIG.NETWORKS
// WBTC addresses:
// Ethereum: 0x2260FAC5E5542a773Aa44fBCfeDd86e03EeADB32
// Polygon: 0x1bfd67037B42cf73acf2047067bd4303cb8aabfb
// Arbitrum: 0x2f2a2440d8db3c0a9a5d0af3efa2e93c5e1bcf14
```

### Option 2: Bitcoin Lightning Network
Fast, micropayment Bitcoin payments

**Pros:**
- ✅ Real Bitcoin, fast
- ✅ Low fees
- ✅ No wrapper needed

**Cons:**
- ⚠️ Requires separate backend
- ⚠️ Complex setup
- ⚠️ Not all users have Lightning wallets

**Setup Needed:**
- Set up Lightning node (LND, CLightning, or use API like BTCPAY)
- Create invoice generator
- Add Lightning backend endpoint

### Option 3: Stacks Protocol (Bitcoin Smart Contracts)
Smart contracts secured by Bitcoin

**Pros:**
- ✅ Real Bitcoin security
- ✅ Permit2-like signature capability
- ✅ Bitcoin settlement

**Cons:**
- ⚠️ Different SDK (Stacks.js)
- ⚠️ Different contract language (Clarity)
- ⚠️ New backend needed

**Setup Needed:**
- Learn Clarity smart contract language
- Deploy contract to Stacks mainnet
- Create Stacks-specific backend

### Option 4: Keep Bitcoin Separate
Accept Bitcoin payments at different address, settle separately

**Pros:**
- ✅ Simple
- ✅ No integration needed
- ✅ Users can send direct

**Cons:**
- ⚠️ Not integrated checkout
- ⚠️ Manual settlement
- ⚠️ Bad UX

---

## 🌊 SOLANA Integration Options

### Option 1: Use Existing Processor (RECOMMENDED - Easiest)
Use Magic Eden, Phantom, or other payment providers

**Pros:**
- ✅ Pre-built UI/UX
- ✅ No backend development
- ✅ Battle-tested security

**Cons:**
- ⚠️ Less control
- ⚠️ API fees
- ⚠️ Vendor lock-in

**Services:**
- Phantom Checkout
- Magic Eden Pay
- Orca
- Serum Pay

### Option 2: Deploy Custom Solana Program (ADVANCED - Full Control)
Write your own Solana program in Rust

**Pros:**
- ✅ Full control
- ✅ Custom logic
- ✅ No external dependencies

**Cons:**
- ⚠️ Complex (Rust + Solana SDK)
- ⚠️ 2-3 weeks development
- ⚠️ Security audit needed

**What You Need:**
```rust
// Solana program setup
use anchor_lang::prelude::*;
use spl_token::instruction::transfer;

#[program]
pub mod checkout {
    use super::*;

    pub fn pay_with_spl_usdc(
        ctx: Context<PayWithToken>,
        amount: u64,
    ) -> Result<()> {
        let transfer_instruction = transfer(
            &spl_token::ID,
            &ctx.accounts.user_token_account.key(),
            &ctx.accounts.merchant_token_account.key(),
            &ctx.accounts.user.key(),
            &[],
            amount,
        )?;
        
        solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.merchant_token_account.to_account_info(),
            ],
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct PayWithToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub merchant_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
```

**RPC URL for Solana:**
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Token Address (SPL-USDC):**
```
SOLANA_USDC=EPjFWaLb3odccxmLizvmmvjhpn
```

### Option 3: Hybrid Approach
Accept Solana via bridge (e.g., through Ethereum)

**Pros:**
- ✅ Use existing EVM contracts
- ✅ Familiar tech stack

**Cons:**
- ⚠️ Bridge fees
- ⚠️ Extra steps for users

---

## ⛓️ TRON Integration Options

### Option 1: Use Existing TRON Processor (EASIEST)
Use TronPay, TronGo, or similar providers

**Pros:**
- ✅ Pre-built TRON integration
- ✅ Quick setup

**Cons:**
- ⚠️ Vendor fees
- ⚠️ Less control

### Option 2: Port Contract to TRON (MODERATE - Recommended)
Adapt your Solidity contract to TRON's TVM

**Pros:**
- ✅ Familiar Solidity (TRON uses Solidity)
- ✅ Full control
- ✅ Can use same contract (mostly)

**Cons:**
- ⚠️ Minor syntax differences
- ⚠️ Different signer setup
- ⚠️ TRON-specific backend

**What Changes:**
1. TRON uses different RPC (TRON Node)
2. Addresses use `T` prefix (vs `0x`)
3. TronWeb library instead of ethers.js
4. Slightly different transaction format

**Frontend Changes (TronWeb):**
```javascript
// Add TronWeb support alongside ethers.js
import TronWeb from 'tronweb';

// Detect TRON wallet (usually Tronlink extension)
const tronWeb = window.tronWeb;

// Deploy contract to TRON:
// TRON RPC: https://api.tronstack.io or https://api.nile.tronstack.io (testnet)
// TRON Chain ID: 1 (mainnet) or 199 (testnet/nile)
```

**Backend Changes:**
```javascript
// Add TRON network support
const TRON_NETWORKS = {
  1: {
    name: "TRON Mainnet",
    rpcUrl: "https://api.tronstack.io",
    contractAddress: "0x...", // TRON contract address (T prefix)
    usdt: "TR7NHqjeKQxGTCi8q282JHJC8JWLbZi5BC", // Tether on TRON
  },
};
```

**TRON Addresses:**
- TRON RPC: `https://api.tronstack.io`
- TRON Testnet (Nile): `https://nile.tronstack.io`
- USDT on TRON: `TR7NHqjeKQxGTCi8q282JHJC8JWLbZi5BC`

### Option 3: Keep TRON Separate
Use TronPay or similar, no integration

---

## 🚀 IMPLEMENTATION PRIORITY

**Recommended Order:**

1. **FIRST**: Add all EVM networks ✅ (DONE - BNB, Linea added)
2. **SECOND**: Add WBTC support (10 minutes)
3. **THIRD**: Add TRON (if interested - 1-2 hours)
4. **FOURTH**: Add Solana (if interested - 2-3 hours or use existing processor)
5. **FIFTH**: Add Bitcoin Lightning (advanced - if needed)

---

## QUICK REFERENCE: What You Need For Each

### Bitcoin
- Choice: WBTC (easy), Lightning (medium), Stacks (hard)
- If WBTC: Just add token address
- If Lightning: Need LND node
- If Stacks: Need Clarity knowledge

### Solana
- Choice: Use processor (easy), custom program (hard)
- If processor: Setup API integration
- If program: Need Rust + Solana SDK
- Token: SPL-USDC
- RPC: api.mainnet-beta.solana.com

### TRON
- Choice: Use processor (easy), port contract (medium)
- If processor: API integration
- If port: Familiar Solidity, TronWeb library
- Token: Tether (USDT)
- RPC: api.tronstack.io

---

## 🎯 YOUR CURRENT SETUP

✅ **EVM Networks Ready to Deploy:**
- Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain, Linea
- Just run deployment + update .env + push

⏳ **Bitcoin, Solana, TRON:**
- Need you to decide approach
- I can help implement any you choose

---

## NEXT STEPS

**Tell me your priority:**

Option A: "Deploy all EVM first, ignore Bitcoin/Solana/TRON for now"
- I'll just focus on getting the 7 EVM networks deployed

Option B: "Add WBTC support"
- 10 minute setup, add Bitcoin wrapping support

Option C: "Add TRON"
- Port contract to TRON, create TRON backend

Option D: "Add Solana"
- Use existing processor OR build custom program

Option E: "Do all of them"
- I'll handle EVM, WBTC, TRON in sequence, then Solana setup

**What's your choice?** 🚀
