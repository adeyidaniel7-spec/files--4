const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import API handlers
const testHandler = require('./handlers/test');
const healthHandler = require('./handlers/health');
const executePaymentHandler = require('./handlers/execute-payment');

// Routes
app.get('/api/test', testHandler);
app.get('/api/health', healthHandler);
app.post('/api/orders/execute-payment', executePaymentHandler);
app.get('/api/orders/execute-payment', executePaymentHandler);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'API Server Running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 CORS enabled`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
