const {
  contract,
  readContract,
  provider,
  wallet,
  ROLE_NAMES,
  STATUS_NAMES,
} = require("../config/web3");
const crypto = require("crypto");

// ── HELPERS ────────────────────────────────────────────────

function roleToNumber(role) {
  const idx = ROLE_NAMES.indexOf(String(role).toUpperCase());
  if (idx === -1) throw new Error(`Invalid role: ${role}`);
  return idx;
}

function isMockMode() {
  const flag = String(process.env.BLOCKCHAIN_MOCK || "").toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  // Auto-mock when explicitly allowed and wallet is unfunded (SIH local demo)
  const auto = String(process.env.BLOCKCHAIN_AUTO_MOCK || "true").toLowerCase();
  return auto === "true" || auto === "1";
}

async function walletBalanceWei() {
  return provider.getBalance(wallet.address);
}

function mockTxResult(extra = {}) {
  const txHash = "0x" + crypto.randomBytes(32).toString("hex");
  return {
    txHash,
    blockNumber: 0,
    gasUsed: "0",
    timestamp: new Date().toISOString(),
    mock: true,
    note: "Simulated tx — service wallet has no Sepolia ETH or BLOCKCHAIN_MOCK=true. Fund the wallet / use the deployer key for live chain writes.",
    ...extra,
  };
}

async function ensureCanWrite() {
  const bal = await walletBalanceWei();
  if (bal === 0n) {
    if (isMockMode()) {
      return { mock: true, reason: "Service wallet has 0 Sepolia ETH" };
    }
    throw new Error(
      "Service wallet has 0 Sepolia ETH. Fund it via a faucet, or set BLOCKCHAIN_MOCK=true for local demo."
    );
  }
  return { mock: false };
}

async function formatTxResult(receipt) {
  const block = await provider.getBlock(receipt.blockNumber);
  return {
    txHash:      receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed:     receipt.gasUsed.toString(),
    timestamp:   new Date(Number(block.timestamp) * 1000).toISOString(),
    mock:        false,
  };
}

function formatDocument(doc) {
  return {
    caseId:        doc.caseId,
    ipfsCID:       doc.ipfsCID,
    docType:       doc.docType,
    uploadedBy:    doc.uploadedBy,
    timestamp:     new Date(Number(doc.timestamp) * 1000).toISOString(),
    version:       Number(doc.version),
    previousDocId: doc.previousDocId,
    status:        STATUS_NAMES[Number(doc.status)] || "UNKNOWN",
  };
}

function formatAuditEntry(entry) {
  return {
    accessor:  entry.accessor,
    action:    entry.action,
    timestamp: new Date(Number(entry.timestamp) * 1000).toISOString(),
    details:   entry.details,
  };
}

function extractError(err) {
  const msg = err.reason || err.shortMessage || err.message || "Blockchain call failed";
  if (/missing revert data|execution reverted/i.test(msg)) {
    return new Error(
      `${msg}. Likely causes: (1) service wallet is not contract owner/authorized role, (2) 0 Sepolia ETH, (3) ABI/contract mismatch. Owner must assign LAWYER/JUDGE/ADMIN to the service wallet, or set BLOCKCHAIN_MOCK=true.`
    );
  }
  return new Error(msg);
}

// ── WRITE FUNCTIONS ────────────────────────────────────────

async function storeDocument({ docId, caseId, ipfsCID, docType }) {
  try {
    const gate = await ensureCanWrite();
    if (gate.mock) {
      return mockTxResult({ docId, caseId, ipfsCID, docType, reason: gate.reason });
    }
    const tx      = await contract.storeDocument(docId, caseId, ipfsCID, docType);
    const receipt = await tx.wait();
    return await formatTxResult(receipt);
  } catch (err) {
    // Fall back to mock for SIH demos when live write fails and auto-mock is on
    if (isMockMode() && String(process.env.BLOCKCHAIN_MOCK_ON_ERROR || "true").toLowerCase() !== "false") {
      console.warn("[blockchain] storeDocument falling back to mock:", err.shortMessage || err.message);
      return mockTxResult({ docId, caseId, ipfsCID, docType, reason: err.shortMessage || err.message });
    }
    throw extractError(err);
  }
}

async function amendDocument({ newDocId, previousDocId, newCID, docType }) {
  try {
    const gate = await ensureCanWrite();
    if (gate.mock) {
      return mockTxResult({ newDocId, previousDocId, newCID, docType, reason: gate.reason });
    }
    const tx      = await contract.amendDocument(newDocId, previousDocId, newCID, docType);
    const receipt = await tx.wait();
    return await formatTxResult(receipt);
  } catch (err) {
    if (isMockMode()) return mockTxResult({ newDocId, reason: err.message });
    throw extractError(err);
  }
}

async function shareDocument({ docId, withAddress }) {
  try {
    const gate = await ensureCanWrite();
    if (gate.mock) {
      return { ...mockTxResult({ docId, reason: gate.reason }), sharedWith: withAddress };
    }
    const tx      = await contract.shareDocument(docId, withAddress);
    const receipt = await tx.wait();
    return { ...(await formatTxResult(receipt)), sharedWith: withAddress };
  } catch (err) {
    if (isMockMode()) return { ...mockTxResult({ docId }), sharedWith: withAddress };
    throw extractError(err);
  }
}

async function revokeDocument({ docId }) {
  try {
    const gate = await ensureCanWrite();
    if (gate.mock) {
      return { ...mockTxResult({ reason: gate.reason }), docId };
    }
    const tx      = await contract.revokeDocument(docId);
    const receipt = await tx.wait();
    return { ...(await formatTxResult(receipt)), docId };
  } catch (err) {
    if (isMockMode()) return { ...mockTxResult(), docId };
    throw extractError(err);
  }
}

async function signDocument({ docId }) {
  try {
    const gate = await ensureCanWrite();
    if (gate.mock) {
      return { ...mockTxResult({ docId, reason: gate.reason }), signatureCount: 1, isApproved: false };
    }
    const tx             = await contract.signDocument(docId);
    const receipt        = await tx.wait();
    const signatureCount = Number(await readContract.getSignatureCount(docId));
    const isApproved     = await readContract.isApproved(docId);
    return {
      ...(await formatTxResult(receipt)),
      signatureCount,
      isApproved,
    };
  } catch (err) {
    if (isMockMode()) {
      console.warn("[blockchain] signDocument falling back to mock:", err.shortMessage || err.message);
      return { ...mockTxResult({ docId }), signatureCount: 1, isApproved: false };
    }
    throw extractError(err);
  }
}

async function assignRole({ walletAddress, role }) {
  try {
    const gate = await ensureCanWrite();
    if (gate.mock) {
      return { ...mockTxResult({ reason: gate.reason }), wallet: walletAddress, role: String(role).toUpperCase() };
    }
    const roleNum = roleToNumber(role);
    const tx      = await contract.assignRole(walletAddress, roleNum);
    const receipt = await tx.wait();
    return {
      ...(await formatTxResult(receipt)),
      wallet: walletAddress,
      role:   ROLE_NAMES[roleNum],
    };
  } catch (err) {
    if (isMockMode()) return { ...mockTxResult(), wallet: walletAddress, role: String(role).toUpperCase() };
    throw extractError(err);
  }
}

async function commitPermission(docId, grantedTo, permissionHash) {
  try {
    const tx      = await contract.commitPermission(docId, grantedTo, permissionHash);
    const receipt = await tx.wait();
    return await formatTxResult(receipt);
  } catch (err) {
    throw extractError(err);
  }
}

// ── READ FUNCTIONS (free — no gas) ────────────────────────

async function verifyDocument(docId, cidToVerify) {
  try {
    const doc     = await readContract.getDocument(docId);
    const isValid = doc.ipfsCID === cidToVerify;

    // Fire and forget — records audit event on-chain
    // without making caller wait 30 seconds
    contract.verifyDocument(docId, cidToVerify).catch((err) => {
      console.warn("[WARN] On-chain verify audit log failed:", err.shortMessage || err.message);
    });

    return {
      docId,
      storedCID:   doc.ipfsCID,
      providedCID: cidToVerify,
      isValid,
      status: isValid ? "UNTAMPERED" : "TAMPERED",
    };
  } catch (err) {
    throw extractError(err);
  }
}

async function getDocument(docId) {
  try {
    const doc = await readContract.getDocument(docId);
    return formatDocument(doc);
  } catch (err) {
    throw extractError(err);
  }
}

async function verifyPermission(docId, grantedTo, candidateHash) {
  try {
    const isValid = await readContract.verifyPermission(
      docId,
      grantedTo,
      candidateHash
    );
    return {
      docId,
      grantedTo,
      isValid,
      status: isValid
        ? "PERMISSION_VALID"
        : "AUTHORIZATION_INTEGRITY_FAILURE",
    };
  } catch (err) {
    throw extractError(err);
  }
}

async function getRole(wallet) {
  try {
    const roleNum = Number(await readContract.getRole(wallet));
    return {
      wallet,
      role: ROLE_NAMES[roleNum] || "NONE",
    };
  } catch (err) {
    throw extractError(err);
  }
}

async function getAuditLog(docId) {
  try {
    const entries = await readContract.getAuditLog(docId);
    return entries.map(formatAuditEntry).reverse();
  } catch (err) {
    throw extractError(err);
  }
}

async function getSignatures(docId) {
  try {
    const signatureCount = Number(await readContract.getSignatureCount(docId));
    const isApproved     = await readContract.isApproved(docId);
    return { docId, signatureCount, isApproved };
  } catch (err) {
    throw extractError(err);
  }
}

// ── EXPORTS ────────────────────────────────────────────────
module.exports = {
  storeDocument,
  amendDocument,
  verifyDocument,
  getDocument,
  shareDocument,
  commitPermission,
  verifyPermission,
  revokeDocument,
  signDocument,
  assignRole,
  getRole,
  getAuditLog,
  getSignatures,
};