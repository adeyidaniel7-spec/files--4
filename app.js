/**
 * Main Express App
 * Integrates checkout backend and relayer routers
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Setup logging
const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
const logStream = fs.createWriteStream(logFile, { flags: "a" });

// Override console.log to write to file and console
const originalLog = console.log;
const originalError = console.error;

console.log = function(...args) {
  const timestamp = new Date().toISOString();
  const message = args.join(" ");
  logStream.write(`[${timestamp}] ${message}\n`);
  originalLog.apply(console, args);
};

console.error = function(...args) {
  const timestamp = new Date().toISOString();
  const message = args.join(" ");
  logStream.write(`[${timestamp}] ERROR: ${message}\n`);
  originalError.apply(console, args);
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Import routers
const checkoutBackend = require("./checkoutBackend");
const checkoutRelayer = require("./checkoutRelayer");

// Mount routers
app.use("/", checkoutBackend);    // Quote and verification endpoints
app.use("/", checkoutRelayer);    // Payment relaying endpoint

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", relayer: "active" });
});

// View logs endpoint
app.get("/logs", (req, res) => {
  try {
    const logContent = fs.readFileSync(logFile, "utf-8");
    const logLines = logContent.split("\n").slice(-100); // Last 100 lines
    res.json({
      file: logFile,
      lines: logLines.filter(line => line.length > 0),
      totalLines: logContent.split("\n").length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read logs" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: err.message || "Internal server error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Express app running on port ${PORT}`);
  console.log(`✓ Checkout backend mounted`);
  console.log(`✓ Checkout relayer mounted`);
  console.log(`\nEndpoints:`);
  console.log(`  POST /api/orders/execute-payment (relayer - gasless)`);
  console.log(`  GET  /api/orders/:orderId/checkout-quote (backend)`);
  console.log(`  POST /api/orders/:orderId/confirm (backend)`);
});

module.exports = app;
