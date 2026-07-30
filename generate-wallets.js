#!/usr/bin/env node
/**
 * Generate Relayer Wallets for Just-In-Time Gas Funding System
 * Run: node generate-wallets.js
 */

import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';
import TronWeb from 'tronweb';

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║         RELAYER WALLET GENERATION FOR JIT SYSTEM             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

// Generate EVM Wallets (same wallet can be used across all EVM chains)
console.log('🔷 EVM RELAYER WALLETS (Ethereum, Base, Polygon, Arbitrum, BNB, Optimism)\n');
console.log('📝 Note: You can use the SAME wallet for all EVM chains to simplify management\n');

const evmWallet = ethers.Wallet.createRandom();
console.log('EVM Relayer Address:', evmWallet.address);
console.log('EVM Relayer Private Key:', evmWallet.privateKey);
console.log('\nAdd these to your .env file:');
console.log(`ETH_RELAYER_KEY=${evmWallet.privateKey}`);
console.log(`BASE_RELAYER_KEY=${evmWallet.privateKey}`);
console.log(`POLYGON_RELAYER_KEY=${evmWallet.privateKey}`);
console.log(`ARBITRUM_RELAYER_KEY=${evmWallet.privateKey}`);
console.log(`BNB_RELAYER_KEY=${evmWallet.privateKey}`);
console.log(`OPTIMISM_RELAYER_KEY=${evmWallet.privateKey}`);

// Generate Solana Wallet
console.log('\n\n🟣 SOLANA RELAYER WALLET\n');
const solanaKeypair = Keypair.generate();
console.log('Solana Relayer Public Key:', solanaKeypair.publicKey.toString());
console.log('Solana Relayer Private Key:', `[${solanaKeypair.secretKey.toString()}]`);
console.log('\nAdd this to your .env file:');
console.log(`SOLANA_RELAYER_PUBKEY=${solanaKeypair.publicKey.toString()}`);

// Generate Tron Wallet
console.log('\n\n🔴 TRON RELAYER WALLET\n');
const tronAccount = TronWeb.utils.accounts.generateAccount();
console.log('Tron Relayer Address:', tronAccount.address.base58);
console.log('Tron Relayer Private Key:', tronAccount.privateKey);
console.log('\nAdd these to your .env file:');
console.log(`TRON_RELAYER_KEY=${tronAccount.privateKey}`);
console.log(`TRON_RELAYER_ADDRESS=${tronAccount.address.base58}`);

// Summary
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('1. These wallets are for RELAYER purposes only (just-in-time funded)');
console.log('2. NEVER store large amounts in these wallets');
console.log('3. Keep the private keys SECRET - add them to .env (NOT .env.example)');
console.log('4. Add .env to .gitignore to prevent accidental commits');
console.log('5. The EVM wallet can be reused across all EVM chains (simplified management)');
console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('✅ Wallets generated successfully!');
console.log('📋 Copy the values above into your server/.env file');
console.log('\n═══════════════════════════════════════════════════════════════\n');
