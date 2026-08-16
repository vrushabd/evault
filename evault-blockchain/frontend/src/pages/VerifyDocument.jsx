import { useState } from "react";
import { verifyDocument, getDocument } from "../api/blockchainApi";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import { truncateAddress, formatDateTime } from "../utils/format";

export default function VerifyDocument() {
  const [docId, setDocId] = useState("");
  const [cid, setCid] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const [detailsDocId, setDetailsDocId] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [document, setDocument] = useState(null);
  const [detailsError, setDetailsError] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const res = await verifyDocument(docId, cid);
      setVerifyResult(res.data.data);
    } catch (err) {
      setVerifyError(err.response?.data?.error || err.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleGetDetails(e) {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsError(null);
    setDocument(null);
    try {
      const res = await getDocument(detailsDocId);
      setDocument(res.data.data);
    } catch (err) {
      setDetailsError(err.response?.data?.error || err.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  const tampered = verifyResult?.status === "TAMPERED";

  return (
    <div className="container">
      <h1 className="page-title">Verify Document</h1>

      <div className="card">
        <h2>Tamper Detection</h2>
        <p style={{ marginBottom: "1rem", color: "#8892aa" }}>
          Compare an IPFS CID against the on-chain record to detect tampering.
        </p>
        <form onSubmit={handleVerify}>
          <label>Document ID</label>
          <input
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            placeholder="DOC-2024-001"
            required
          />
          <label>IPFS CID to Verify</label>
          <input
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            placeholder="QmXyz..."
            required
          />
          <button type="submit" disabled={verifyLoading}>
            {verifyLoading ? "Verifying..." : "Verify Document"}
          </button>
        </form>

        {verifyLoading && <LoadingSpinner message="Checking blockchain record..." />}
        {verifyError && <div className="error"><strong>Error:</strong> {verifyError}</div>}

        {verifyResult && (
          <div className={`verify-result ${tampered ? "tampered" : "untampered"}`}>
            <div className="verify-icon" style={{ color: tampered ? "#EB5757" : "#27AE60" }}>
              {tampered ? "✕" : "✓"}
            </div>
            <div
              className="verify-title"
              style={{ color: tampered ? "#EB5757" : "#27AE60" }}
            >
              {tampered ? "DOCUMENT TAMPERED" : "DOCUMENT VERIFIED"}
            </div>
            <p style={{ marginBottom: "1rem" }}>
              {tampered
                ? "WARNING: This document has been modified"
                : "This document has not been tampered with"}
            </p>
            <p><strong>Document ID:</strong> {verifyResult.docId}</p>
            <div className="cid-row">
              <div className="cid-box" style={{ background: "#1a3a2a", color: "#6FCF97" }}>
                <div style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>STORED CID</div>
                {verifyResult.storedCID}
              </div>
              <div
                className="cid-box"
                style={{
                  background: tampered ? "#3a1a1a" : "#1a3a2a",
                  color: tampered ? "#EB5757" : "#6FCF97",
                }}
              >
                <div style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>PROVIDED CID</div>
                {verifyResult.providedCID}
              </div>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <StatusBadge status={verifyResult.status} />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Get Document Details</h2>
        <form onSubmit={handleGetDetails}>
          <label>Document ID</label>
          <input
            value={detailsDocId}
            onChange={(e) => setDetailsDocId(e.target.value)}
            placeholder="DOC-2024-001"
            required
          />
          <button type="submit" disabled={detailsLoading}>
            {detailsLoading ? "Fetching..." : "Fetch Document"}
          </button>
        </form>

        {detailsLoading && <LoadingSpinner message="Reading from blockchain..." />}
        {detailsError && <div className="error"><strong>Error:</strong> {detailsError}</div>}

        {document && (
          <div style={{ marginTop: "1rem" }}>
            <div className="detail-row">
              <span className="detail-label">Case ID</span>
              <span className="detail-value">{document.caseId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Doc Type</span>
              <span className="detail-value">{document.docType}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Uploaded By</span>
              <span className="detail-value">{truncateAddress(document.uploadedBy)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Timestamp</span>
              <span className="detail-value">{formatDateTime(document.timestamp)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Version</span>
              <span className="detail-value">{document.version}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value"><StatusBadge status={document.status} /></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">IPFS CID</span>
              <span className="detail-value">{document.ipfsCID}</span>
            </div>
            {document.previousDocId && (
              <div className="detail-row">
                <span className="detail-label">Previous Doc ID</span>
                <span className="detail-value">{document.previousDocId}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
