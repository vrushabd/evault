require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const blockchainRoutes = require("./routes/blockchain");
const {
  provider,
  wallet,
  readContract,
  contractAddress,
} = require("./config/web3");

const app = express();
const PORT = process.env.PORT || 8083;
const SEPOLIA_CHAIN_ID = 11155111n;
const BANNER = "=================================";

// ── MIDDLEWARE ─────────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://localhost:3001,http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// ── REQUEST LOGGER ─────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ── ROUTES ─────────────────────────────────────────────────
app.use("/blockchain", blockchainRoutes);

// ── 404 HANDLER ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ── GLOBAL ERROR HANDLER ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ── STARTUP VALIDATION ─────────────────────────────────────
async function validateStartup() {
  console.log(BANNER);
  console.log("  eVault Blockchain - Startup Check");
  console.log(BANNER);

  // 1. Network check
  const network = await provider.getNetwork();
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      "CRITICAL: Wrong network. Expected Sepolia (11155111)"
    );
  }
  console.log("[OK] RPC Connected: Sepolia (11155111)");

  // 2. Contract existence check
  const code = await provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error(
      "CRITICAL: No contract at CONTRACT_ADDRESS. Check .env and redeploy."
    );
  }
  console.log("[OK] Contract verified on-chain");

  // 3. Wallet balance check (non-fatal)
  const balanceWei = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balanceWei);
  if (balanceWei === 0n) {
    console.warn("[WARN] Wallet has 0 ETH. Transactions will fail.");
  }
  console.log(`[OK] Wallet: ${wallet.address}`);
  console.log(`[OK] Balance: ${balanceEth} ETH`);

  // 4. Contract owner check (non-fatal)
  const owner = await readContract.owner();
  if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
    console.warn(
      "[WARN] Wallet is not contract owner. Admin functions (assignRole) will fail."
    );
  } else {
    console.log("[OK] Contract owner confirmed");
  }

  console.log("[OK] All checks passed");
  console.log(BANNER);
}

// ── START SERVER ───────────────────────────────────────────
async function startServer() {
  try {
    await validateStartup();
    app.listen(PORT, () => {
      console.log(`eVault Blockchain Service running on port ${PORT}`);
      console.log("Network: Sepolia Testnet");
      console.log(`Health: http://localhost:${PORT}/blockchain/health`);
    });
  } catch (err) {
    console.error(err.message || err);
    console.error(BANNER);
    console.error("  STARTUP FAILED - fix errors above");
    console.error(BANNER);
    process.exit(1);
  }
}

// ── UNHANDLED REJECTION SAFETY NET ────────────────────────
process.on("unhandledRejection", (err) => {
  console.error("[FATAL] Unhandled rejection:", err);
  process.exit(1);
});

startServer();