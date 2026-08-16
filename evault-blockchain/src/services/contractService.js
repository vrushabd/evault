const {
  contract,
  readContract,
  provider,
  ROLE_NAMES,
  STATUS_NAMES,
} = require("../config/web3");

// ── HELPERS ────────────────────────────────────────────────

function roleToNumber(role) {
  const idx = ROLE_NAMES.indexOf(String(role).toUpperCase());
  if (idx === -1) throw new Error(`Invalid role: ${role}`);
  return idx;
}

async function formatTxResult(receipt) {
  // Use actual block timestamp not client time
  const block = await provider.getBlock(receipt.blockNumber);
  return {
    txHash:      receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed:     receipt.gasUsed.toString(),
    timestamp:   new Date(Number(block.timestamp) * 1000).toISOString(),
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
  return new Error(err.reason || err.shortMessage || err.message);
}

// ── WRITE FUNCTIONS ────────────────────────────────────────

async function storeDocument({ docId, caseId, ipfsCID, docType }) {
  try {
    const tx      = await contract.storeDocument(docId, caseId, ipfsCID, docType);
    const receipt = await tx.wait();
    return await formatTxResult(receipt);
  } catch (err) {
    throw extractError(err);
  }
}

async function amendDocument({ newDocId, previousDocId, newCID, docType }) {
  try {
    const tx      = await contract.amendDocument(newDocId, previousDocId, newCID, docType);
    const receipt = await tx.wait();
    return await formatTxResult(receipt);
  } catch (err) {
    throw extractError(err);
  }
}

async function shareDocument({ docId, withAddress }) {
  try {
    const tx      = await contract.shareDocument(docId, withAddress);
    const receipt = await tx.wait();
    return { ...(await formatTxResult(receipt)), sharedWith: withAddress };
  } catch (err) {
    throw extractError(err);
  }
}

async function revokeDocument({ docId }) {
  try {
    const tx      = await contract.revokeDocument(docId);
    const receipt = await tx.wait();
    return { ...(await formatTxResult(receipt)), docId };
  } catch (err) {
    throw extractError(err);
  }
}

async function signDocument({ docId }) {
  try {
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
    throw extractError(err);
  }
}

async function assignRole({ walletAddress, role }) {
  try {
    const roleNum = roleToNumber(role);
    const tx      = await contract.assignRole(walletAddress, roleNum);
    const receipt = await tx.wait();
    return {
      ...(await formatTxResult(receipt)),
      wallet: walletAddress,
      role:   ROLE_NAMES[roleNum],
    };
  } catch (err) {
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