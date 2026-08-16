import { useState } from "react";
import { storeDocument, amendDocument } from "../api/blockchainApi";
import LoadingSpinner from "../components/LoadingSpinner";
import TxHashLink from "../components/TxHashLink";

const DOC_TYPES = [
  "FIR",
  "Judgment",
  "Bail Order",
  "Evidence",
  "Charge Sheet",
  "Affidavit",
  "Legal Notice",
];

function ResultCard({ result, error }) {
  if (error) {
    return <div className="error"><strong>Error:</strong> {error}</div>;
  }
  if (!result) return null;
  return (
    <div className="success">
      <p><strong>Transaction Hash:</strong> <TxHashLink hash={result.txHash} /></p>
      <p><strong>Block Number:</strong> {result.blockNumber}</p>
      <p><strong>Gas Used:</strong> {result.gasUsed}</p>
      <p><strong>Timestamp:</strong> {result.timestamp}</p>
    </div>
  );
}

export default function StoreDocument() {
  const [storeForm, setStoreForm] = useState({
    docId: "",
    caseId: "",
    ipfsCID: "",
    docType: "FIR",
  });
  const [amendForm, setAmendForm] = useState({
    newDocId: "",
    previousDocId: "",
    newCID: "",
    docType: "FIR",
  });
  const [storeLoading, setStoreLoading] = useState(false);
  const [amendLoading, setAmendLoading] = useState(false);
  const [storeResult, setStoreResult] = useState(null);
  const [amendResult, setAmendResult] = useState(null);
  const [storeError, setStoreError] = useState(null);
  const [amendError, setAmendError] = useState(null);

  async function handleStore(e) {
    e.preventDefault();
    setStoreLoading(true);
    setStoreError(null);
    setStoreResult(null);
    try {
      const res = await storeDocument(storeForm);
      setStoreResult(res.data.data);
    } catch (err) {
      setStoreError(err.response?.data?.error || err.message);
    } finally {
      setStoreLoading(false);
    }
  }

  async function handleAmend(e) {
    e.preventDefault();
    setAmendLoading(true);
    setAmendError(null);
    setAmendResult(null);
    try {
      const res = await amendDocument(amendForm);
      setAmendResult(res.data.data);
    } catch (err) {
      setAmendError(err.response?.data?.error || err.message);
    } finally {
      setAmendLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 className="page-title">Store Document</h1>

      <div className="card">
        <h2>Store New Document on Blockchain</h2>
        <form onSubmit={handleStore}>
          <label>Document ID</label>
          <input
            value={storeForm.docId}
            onChange={(e) => setStoreForm({ ...storeForm, docId: e.target.value })}
            placeholder="DOC-2024-001"
            required
          />
          <label>Case ID</label>
          <input
            value={storeForm.caseId}
            onChange={(e) => setStoreForm({ ...storeForm, caseId: e.target.value })}
            placeholder="CASE-MH-2024-001"
            required
          />
          <label>IPFS CID</label>
          <input
            value={storeForm.ipfsCID}
            onChange={(e) => setStoreForm({ ...storeForm, ipfsCID: e.target.value })}
            placeholder="QmXyz..."
            required
          />
          <label>Document Type</label>
          <select
            value={storeForm.docType}
            onChange={(e) => setStoreForm({ ...storeForm, docType: e.target.value })}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" disabled={storeLoading}>
            {storeLoading ? "Submitting..." : "Store on Blockchain"}
          </button>
        </form>
        {storeLoading && <LoadingSpinner message="Submitting to blockchain..." />}
        <ResultCard result={storeResult} error={storeError} />
      </div>

      <hr className="section-divider" />

      <div className="card">
        <h2>Amend Document</h2>
        <form onSubmit={handleAmend}>
          <label>New Document ID</label>
          <input
            value={amendForm.newDocId}
            onChange={(e) => setAmendForm({ ...amendForm, newDocId: e.target.value })}
            placeholder="DOC-2024-001-v2"
            required
          />
          <label>Previous Document ID</label>
          <input
            value={amendForm.previousDocId}
            onChange={(e) => setAmendForm({ ...amendForm, previousDocId: e.target.value })}
            placeholder="DOC-2024-001"
            required
          />
          <label>New IPFS CID</label>
          <input
            value={amendForm.newCID}
            onChange={(e) => setAmendForm({ ...amendForm, newCID: e.target.value })}
            placeholder="QmNew..."
            required
          />
          <label>Document Type</label>
          <select
            value={amendForm.docType}
            onChange={(e) => setAmendForm({ ...amendForm, docType: e.target.value })}
          >
            {DOC_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button type="submit" disabled={amendLoading}>
            {amendLoading ? "Submitting..." : "Amend on Blockchain"}
          </button>
        </form>
        {amendLoading && <LoadingSpinner message="Submitting amendment to blockchain..." />}
        <ResultCard result={amendResult} error={amendError} />
      </div>
    </div>
  );
}
