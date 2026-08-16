const express = require("express");
const { ethers } = require("ethers");
const contractService = require("../services/contractService");
const { checkConnection, contractAddress } = require("../config/web3");

const router = express.Router();

const VALID_ROLES = ["CLIENT", "LAWYER", "JUDGE", "ADMIN"];
const MAX_ID_LENGTH = 200;

// ── VALIDATORS ─────────────────────────────────────────────
function isBytes32Hex(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isValidId(id) {
  return id && typeof id === "string" && id.length <= MAX_ID_LENGTH;
}

// ── HEALTH ─────────────────────────────────────────────────
router.get("/health", async (req, res) => {
  try {
    const connection = await checkConnection();
    res.json({
      success: true,
      data: {
        service: "eVault Blockchain Service",
        port: process.env.PORT || 8083,
        network: "Sepolia Testnet",
        contractAddress,
        ...connection,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STORE DOCUMENT ─────────────────────────────────────────
router.post("/store", async (req, res) => {
  try {
    const { docId, caseId, ipfsCID, docType } = req.body;
    if (!docId || !caseId || !ipfsCID || !docType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: docId, caseId, ipfsCID, docType",
      });
    }
    if (!isValidId(docId) || !isValidId(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid docId or caseId" });
    }
    const data = await contractService.storeDocument(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AMEND DOCUMENT ─────────────────────────────────────────
router.post("/amend", async (req, res) => {
  try {
    const { newDocId, previousDocId, newCID, docType } = req.body;
    if (!newDocId || !previousDocId || !newCID || !docType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: newDocId, previousDocId, newCID, docType",
      });
    }
    const data = await contractService.amendDocument(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── VERIFY DOCUMENT ────────────────────────────────────────
router.get("/verify/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const { cid, hash } = req.query;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "Invalid docId" });
    }
    if (!cid) {
      return res.status(400).json({ success: false, error: "cid query parameter is required" });
    }
    const data = await contractService.verifyDocument(docId, cid, hash || null);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET DOCUMENT ───────────────────────────────────────────
router.get("/document/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "Invalid docId" });
    }
    const data = await contractService.getDocument(docId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SHARE DOCUMENT ─────────────────────────────────────────
router.post("/share", async (req, res) => {
  try {
    const { docId, withAddress } = req.body;
    if (!docId || !withAddress) {
      return res.status(400).json({
        success: false,
        error: "docId and withAddress are required",
      });
    }
    if (!ethers.isAddress(withAddress)) {
      return res.status(400).json({
        success: false,
        error: "withAddress must be a valid Ethereum address",
      });
    }
    const data = await contractService.shareDocument(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PERMISSION COMMIT ──────────────────────────────────────
router.post("/permissions/commit", async (req, res) => {
  try {
    const { docId, grantedTo, permissionHash } = req.body;
    if (!docId || !grantedTo || !permissionHash) {
      return res.status(400).json({
        success: false,
        error: "docId, grantedTo and permissionHash are required",
      });
    }
    if (!ethers.isAddress(grantedTo)) {
      return res.status(400).json({
        success: false,
        error: "grantedTo must be a valid wallet address",
      });
    }
    if (!isBytes32Hex(permissionHash)) {
      return res.status(400).json({
        success: false,
        error: "permissionHash must be a bytes32 hex string (0x + 64 hex chars)",
      });
    }
    const data = await contractService.commitPermission(docId, grantedTo, permissionHash);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PERMISSION VERIFY ──────────────────────────────────────
router.get("/permissions/verify/:docId/:wallet", async (req, res) => {
  try {
    const { docId, wallet } = req.params;
    const { hash }          = req.query;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "Invalid docId" });
    }
    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({
        success: false,
        error: "wallet must be a valid Ethereum address",
      });
    }
    if (!hash) {
      return res.status(400).json({ success: false, error: "hash query parameter is required" });
    }
    if (!isBytes32Hex(hash)) {
      return res.status(400).json({
        success: false,
        error: "hash must be a bytes32 hex string (0x + 64 hex chars)",
      });
    }
    const data = await contractService.verifyPermission(docId, wallet, hash);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── REVOKE DOCUMENT ────────────────────────────────────────
router.post("/revoke", async (req, res) => {
  try {
    const { docId } = req.body;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "docId is required" });
    }
    const data = await contractService.revokeDocument(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SIGN DOCUMENT ──────────────────────────────────────────
router.post("/sign", async (req, res) => {
  try {
    const { docId } = req.body;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "docId is required" });
    }
    const data = await contractService.signDocument(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── ASSIGN ROLE ────────────────────────────────────────────
router.post("/roles/assign", async (req, res) => {
  try {
    const { walletAddress, role } = req.body;
    if (!walletAddress || !role) {
      return res.status(400).json({
        success: false,
        error: "walletAddress and role are required",
      });
    }
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: "walletAddress must be a valid Ethereum address",
      });
    }
    if (!VALID_ROLES.includes(role.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      });
    }
    const data = await contractService.assignRole(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET ROLE ───────────────────────────────────────────────
router.get("/roles/:wallet", async (req, res) => {
  try {
    const { wallet } = req.params;
    if (!ethers.isAddress(wallet)) {
      return res.status(400).json({
        success: false,
        error: "wallet must be a valid Ethereum address",
      });
    }
    const data = await contractService.getRole(wallet);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AUDIT LOG ──────────────────────────────────────────────
router.get("/audit/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "Invalid docId" });
    }
    const data = await contractService.getAuditLog(docId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SIGNATURES ─────────────────────────────────────────────
router.get("/signatures/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    if (!isValidId(docId)) {
      return res.status(400).json({ success: false, error: "Invalid docId" });
    }
    const data = await contractService.getSignatures(docId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;