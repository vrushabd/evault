import { useState } from "react";
import {
  assignRole,
  getRole,
  shareDocument,
  signDocument,
  revokeDocument,
} from "../api/blockchainApi";
import LoadingSpinner from "../components/LoadingSpinner";
import TxHashLink from "../components/TxHashLink";
import StatusBadge from "../components/StatusBadge";

const ROLES = ["CLIENT", "LAWYER", "JUDGE", "ADMIN"];

function TxResult({ result, error }) {
  if (error) return <div className="error"><strong>Error:</strong> {error}</div>;
  if (!result) return null;
  return (
    <div className="success">
      {result.txHash && (
        <p><strong>Transaction:</strong> <TxHashLink hash={result.txHash} /></p>
      )}
      {result.role && <p><strong>Role:</strong> <StatusBadge status={result.role} /></p>}
      {result.wallet && <p><strong>Wallet:</strong> {result.wallet}</p>}
      {result.sharedWith && <p><strong>Shared With:</strong> {result.sharedWith}</p>}
      {result.signatureCount !== undefined && (
        <p><strong>Signatures:</strong> {result.signatureCount} / 2</p>
      )}
      {result.isApproved !== undefined && (
        <p><strong>Approved:</strong> {result.isApproved ? "Yes" : "No"}</p>
      )}
      {result.docId && <p><strong>Document:</strong> {result.docId}</p>}
    </div>
  );
}

export default function RoleManager() {
  const [assignForm, setAssignForm] = useState({ walletAddress: "", role: "CLIENT" });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignResult, setAssignResult] = useState(null);
  const [assignError, setAssignError] = useState(null);

  const [checkWallet, setCheckWallet] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState(null);

  const [shareForm, setShareForm] = useState({ docId: "", withAddress: "" });
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState(null);
  const [shareError, setShareError] = useState(null);

  const [signDocId, setSignDocId] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [signResult, setSignResult] = useState(null);
  const [signError, setSignError] = useState(null);

  const [revokeDocId, setRevokeDocId] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeResult, setRevokeResult] = useState(null);
  const [revokeError, setRevokeError] = useState(null);

  async function handleAssign(e) {
    e.preventDefault();
    setAssignLoading(true);
    setAssignError(null);
    setAssignResult(null);
    try {
      const res = await assignRole(assignForm);
      setAssignResult(res.data.data);
    } catch (err) {
      setAssignError(err.response?.data?.error || err.message);
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleCheck(e) {
    e.preventDefault();
    setCheckLoading(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      const res = await getRole(checkWallet);
      setCheckResult(res.data.data);
    } catch (err) {
      setCheckError(err.response?.data?.error || err.message);
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleShare(e) {
    e.preventDefault();
    setShareLoading(true);
    setShareError(null);
    setShareResult(null);
    try {
      const res = await shareDocument(shareForm);
      setShareResult(res.data.data);
    } catch (err) {
      setShareError(err.response?.data?.error || err.message);
    } finally {
      setShareLoading(false);
    }
  }

  async function handleSign(e) {
    e.preventDefault();
    setSignLoading(true);
    setSignError(null);
    setSignResult(null);
    try {
      const res = await signDocument({ docId: signDocId });
      setSignResult(res.data.data);
    } catch (err) {
      setSignError(err.response?.data?.error || err.message);
    } finally {
      setSignLoading(false);
    }
  }

  async function handleRevoke(e) {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to revoke this document on-chain? This action is permanent.")) {
      return;
    }
    setRevokeLoading(true);
    setRevokeError(null);
    setRevokeResult(null);
    try {
      const res = await revokeDocument({ docId: revokeDocId });
      setRevokeResult(res.data.data);
    } catch (err) {
      setRevokeError(err.response?.data?.error || err.message);
    } finally {
      setRevokeLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Role Manager</h1>

      <div className="grid-2">
        <div className="card">
          <h2>Assign Role</h2>
          <form onSubmit={handleAssign}>
            <label>Wallet Address</label>
            <input
              value={assignForm.walletAddress}
              onChange={(e) => setAssignForm({ ...assignForm, walletAddress: e.target.value })}
              placeholder="0x..."
              required
            />
            <label>Role</label>
            <select
              value={assignForm.role}
              onChange={(e) => setAssignForm({ ...assignForm, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button type="submit" disabled={assignLoading}>
              {assignLoading ? "Assigning..." : "Assign Role on Blockchain"}
            </button>
          </form>
          {assignLoading && <LoadingSpinner message="Submitting role assignment..." />}
          <TxResult result={assignResult} error={assignError} />
        </div>

        <div className="card">
          <h2>Check Role</h2>
          <form onSubmit={handleCheck}>
            <label>Wallet Address</label>
            <input
              value={checkWallet}
              onChange={(e) => setCheckWallet(e.target.value)}
              placeholder="0x..."
              required
            />
            <button type="submit" disabled={checkLoading}>
              {checkLoading ? "Checking..." : "Check Role"}
            </button>
          </form>
          {checkLoading && <LoadingSpinner message="Reading role from blockchain..." />}
          {checkError && <div className="error"><strong>Error:</strong> {checkError}</div>}
          {checkResult && (
            <div className="success" style={{ marginTop: "1rem" }}>
              <p><strong>Wallet:</strong> {checkResult.wallet}</p>
              <p><strong>Role:</strong> <StatusBadge status={checkResult.role} /></p>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Share Document</h2>
        <form onSubmit={handleShare}>
          <div className="grid-2">
            <div>
              <label>Document ID</label>
              <input
                value={shareForm.docId}
                onChange={(e) => setShareForm({ ...shareForm, docId: e.target.value })}
                placeholder="DOC-2024-001"
                required
              />
            </div>
            <div>
              <label>Wallet Address</label>
              <input
                value={shareForm.withAddress}
                onChange={(e) => setShareForm({ ...shareForm, withAddress: e.target.value })}
                placeholder="0x..."
                required
              />
            </div>
          </div>
          <button type="submit" disabled={shareLoading}>
            {shareLoading ? "Sharing..." : "Share on Blockchain"}
          </button>
        </form>
        {shareLoading && <LoadingSpinner message="Recording share on blockchain..." />}
        <TxResult result={shareResult} error={shareError} />
      </div>

      <div className="card">
        <h2>Sign Document (Multi-sig)</h2>
        <form onSubmit={handleSign}>
          <label>Document ID</label>
          <input
            value={signDocId}
            onChange={(e) => setSignDocId(e.target.value)}
            placeholder="DOC-2024-001"
            required
          />
          <button type="submit" disabled={signLoading}>
            {signLoading ? "Signing..." : "Sign Document as Judge"}
          </button>
        </form>
        {signLoading && <LoadingSpinner message="Adding judge signature..." />}
        <TxResult result={signResult} error={signError} />
      </div>

      <div className="card">
        <h2>Revoke Document</h2>
        <form onSubmit={handleRevoke}>
          <label>Document ID</label>
          <input
            value={revokeDocId}
            onChange={(e) => setRevokeDocId(e.target.value)}
            placeholder="DOC-2024-001"
            required
          />
          <button type="submit" className="danger" disabled={revokeLoading}>
            {revokeLoading ? "Revoking..." : "Revoke Document"}
          </button>
        </form>
        {revokeLoading && <LoadingSpinner message="Revoking document on blockchain..." />}
        <TxResult result={revokeResult} error={revokeError} />
      </div>
    </div>
  );
}
