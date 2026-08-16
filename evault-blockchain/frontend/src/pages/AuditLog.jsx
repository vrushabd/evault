import { useState } from "react";
import { getAuditLog, getSignatures } from "../api/blockchainApi";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import { truncateAddress, formatDateTime } from "../utils/format";

const ACTION_BADGE = {
  UPLOAD: "badge-blue",
  VIEW: "badge-gray",
  SHARE: "badge-purple",
  VERIFY: "badge-yellow",
  REVOKE: "badge-red",
  AMEND: "badge-orange",
  SIGN: "badge-gold",
};

const ACTION_BORDER = {
  UPLOAD: "#56CCF2",
  VIEW: "#BDBDBD",
  SHARE: "#BB6BD9",
  VERIFY: "#F2C94C",
  REVOKE: "#EB5757",
  AMEND: "#F2994A",
  SIGN: "#C9A84C",
};

export default function AuditLog() {
  const [docId, setDocId] = useState("");
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  const [sigDocId, setSigDocId] = useState("");
  const [sigLoading, setSigLoading] = useState(false);
  const [signatures, setSignatures] = useState(null);
  const [sigError, setSigError] = useState(null);

  async function handleFetchAudit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEntries(null);
    try {
      const res = await getAuditLog(docId);
      setEntries(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchSignatures(e) {
    e.preventDefault();
    setSigLoading(true);
    setSigError(null);
    setSignatures(null);
    try {
      const res = await getSignatures(sigDocId);
      setSignatures(res.data.data);
    } catch (err) {
      setSigError(err.response?.data?.error || err.message);
    } finally {
      setSigLoading(false);
    }
  }

  const sigProgress = signatures ? (signatures.signatureCount / 2) * 100 : 0;

  return (
    <div className="container">
      <h1 className="page-title">Audit Log</h1>

      <div className="card">
        <h2>Immutable Audit Trail</h2>
        <form onSubmit={handleFetchAudit}>
          <label>Document ID</label>
          <input
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            placeholder="DOC-2024-001"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Fetching..." : "Fetch Audit Log"}
          </button>
        </form>

        {loading && <LoadingSpinner message="Reading audit log from blockchain..." />}
        {error && <div className="error"><strong>Error:</strong> {error}</div>}

        {entries !== null && (
          <div style={{ marginTop: "1.5rem" }}>
            <p style={{ marginBottom: "1rem", fontWeight: 600 }}>
              {entries.length} event{entries.length !== 1 ? "s" : ""} found on blockchain
            </p>
            {entries.length === 0 ? (
              <div className="empty-state">No audit log found for this document ID</div>
            ) : (
              entries.map((entry, i) => (
                <div
                  className="timeline-item"
                  key={i}
                  style={{ borderLeftColor: ACTION_BORDER[entry.action] || "#2F80ED" }}
                >
                  <div className="timeline-header">
                    <span className={`badge ${ACTION_BADGE[entry.action] || "badge-gray"}`}>
                      {entry.action}
                    </span>
                    <span>{truncateAddress(entry.accessor)}</span>
                    <span style={{ color: "#8892aa", fontSize: "0.85rem" }}>
                      {formatDateTime(entry.timestamp)}
                    </span>
                  </div>
                  {entry.details && (
                    <p style={{ color: "#aab4cc", fontSize: "0.9rem" }}>{entry.details}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Signature Status</h2>
        <form onSubmit={handleFetchSignatures}>
          <label>Document ID</label>
          <input
            value={sigDocId}
            onChange={(e) => setSigDocId(e.target.value)}
            placeholder="DOC-2024-001"
            required
          />
          <button type="submit" disabled={sigLoading}>
            {sigLoading ? "Fetching..." : "Check Signatures"}
          </button>
        </form>

        {sigLoading && <LoadingSpinner message="Checking signature status..." />}
        {sigError && <div className="error"><strong>Error:</strong> {sigError}</div>}

        {signatures && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="detail-row">
              <span className="detail-label">Document ID</span>
              <span className="detail-value">{signatures.docId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Signatures</span>
              <span className="detail-value">
                {signatures.signatureCount} / 2
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Approval Status</span>
              <span className="detail-value">
                {signatures.isApproved ? (
                  <StatusBadge status="ACTIVE" />
                ) : (
                  <span className="badge badge-yellow">PENDING</span>
                )}
                {signatures.isApproved && (
                  <span style={{ marginLeft: "0.5rem", color: "#6FCF97" }}>APPROVED</span>
                )}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${sigProgress}%` }} />
            </div>
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#8892aa" }}>
              {signatures.isApproved
                ? "Document has received 2 judge signatures and is approved."
                : `${2 - signatures.signatureCount} more judge signature(s) required.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
