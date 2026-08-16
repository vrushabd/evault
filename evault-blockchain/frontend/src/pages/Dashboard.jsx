import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHealth, getStoredActivity, onApiActivity } from "../api/blockchainApi";
import { truncateAddress, copyToClipboard } from "../utils/format";

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [activity, setActivity] = useState(getStoredActivity().slice(0, 5));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getHealth()
      .then((res) => setHealth(res.data.data))
      .catch(() => setHealth({ connected: false }));

    return onApiActivity(() => {
      setActivity(getStoredActivity().slice(0, 5));
    });
  }, []);

  function handleCopy() {
    if (health?.contractAddress) {
      copyToClipboard(health.contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Blockchain Service Dashboard</h1>

      <div className="card">
        <h2>Service Status</h2>
        {health ? (
          <>
            <p><strong>Service:</strong> {health.service}</p>
            <p><strong>Port:</strong> {health.port}</p>
            <p><strong>Network:</strong> {health.network}</p>
            <div className="copy-row">
              <p><strong>Contract:</strong> {truncateAddress(health.contractAddress)}</p>
              <button type="button" className="outline" onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p>
              <span
                className="dot"
                style={{ background: health.connected ? "#27AE60" : "#EB5757", display: "inline-block", marginRight: "0.5rem" }}
              />
              {health.connected ? "Connected to Sepolia" : "Disconnected"}
              {health.blockNumber && ` — Block #${health.blockNumber}`}
            </p>
          </>
        ) : (
          <p>Checking service health...</p>
        )}
      </div>

      <div className="grid-4">
        <div className="card">
          <div className="stat-value">—</div>
          <div className="stat-label">Documents Stored</div>
        </div>
        <div className="card">
          <div className="stat-value">—</div>
          <div className="stat-label">Verifications Run</div>
        </div>
        <div className="card">
          <div className="stat-value">—</div>
          <div className="stat-label">Roles Assigned</div>
        </div>
        <div className="card">
          <div className="stat-value" style={{ fontSize: "1.1rem" }}>Sepolia</div>
          <div className="stat-label">Network</div>
        </div>
      </div>

      <div className="card">
        <h2>Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="empty-state">No API activity yet. Use the app to see calls here.</div>
        ) : (
          activity.map((entry, i) => (
            <div className="activity-row" key={i}>
              <span className={`badge ${entry.method === "GET" ? "badge-blue" : "badge-gold"}`}>
                {entry.method}
              </span>
              <span>{entry.endpoint}</span>
              <span style={{ marginLeft: "auto", color: "#8892aa", fontSize: "0.85rem" }}>
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="quick-actions">
        <Link to="/store"><button type="button">Store Document</button></Link>
        <Link to="/verify"><button type="button" className="secondary">Verify Document</button></Link>
        <Link to="/audit"><button type="button" className="secondary">View Audit Log</button></Link>
        <Link to="/roles"><button type="button" className="secondary">Manage Roles</button></Link>
      </div>
    </div>
  );
}
