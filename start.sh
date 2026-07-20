#!/bin/bash
# Quick start script for the Web3 checkout system

echo "🚀 Web3 Checkout System - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "Create .env from .env.example and add your configuration:"
  echo ""
  echo "  cp .env.example .env"
  echo "  # Edit .env with your values"
  echo ""
  exit 1
fi

echo "✓ .env file found"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

echo "✓ Dependencies installed"
echo ""

# Start backend
echo "🔧 Starting Express backend..."
echo "======================================"
echo ""
echo "Backend running at: http://localhost:3000"
echo ""
echo "Endpoints:"
echo "  POST /api/orders/execute-payment"
echo "  GET  /api/orders/:orderId/checkout-quote"
echo "  POST /api/orders/:orderId/confirm"
echo ""
echo "Press Ctrl+C to stop"
echo ""

node app.js
