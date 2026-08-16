import React, { useState, useEffect } from 'react';
import {
  FileText, UploadSimple, ShareNetwork, LockKey, CheckCircle, Warning,
  ArrowsClockwise, DownloadSimple, ShieldCheck, Clock,
} from '@phosphor-icons/react';
import api from '../services/api';

const UPLOAD_STEPS = [
  { id: 'select', label: 'Select document' },
  { id: 'encrypt', label: 'Encrypting (AES-256-GCM)' },
  { id: 'ipfs', label: 'Uploading encrypted blob to IPFS' },
  { id: 'chain', label: 'Registering metadata on Sepolia' },
  { id: 'meta', label: 'Saving metadata' },
  { id: 'audit', label: 'Recording audit event' },
  { id: 'done', label: 'Document secured' },
];

export function LawyerDashboard({ currentUser, walletAddress, prefill }) {
  const [caseId, setCaseId] = useState(prefill?.caseNumber || '');
  const [docType, setDocType] = useState(prefill?.documentType || 'Bail Order');
  const [selectedFile, setSelectedFile] = useState(prefill?.file || null);
  const [shareWallet, setShareWallet] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [auditLogs, setAuditLogs] = useState(null);

  const displayName = currentUser?.name || 'Advocate';
  const bar = currentUser?.barNumber || '—';
  const role = currentUser?.role || 'LAWYER';

  useEffect(() => {
    if (!prefill) return;
    if (prefill.caseNumber) setCaseId(prefill.caseNumber);
    if (prefill.documentType) setDocType(prefill.documentType);
    if (prefill.file) setSelectedFile(prefill.file);
  }, [prefill]);

  const advanceStep = (id) => setUploadStep(id);

  const handleUploadAndEncrypt = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a legal document PDF.');
      return;
    }
    if (!caseId.trim()) {
      setError('Enter the associated case ID.');
      return;
    }
    const token = localStorage.getItem('evault-token');
    if (!token) {
      setError('Connect MetaMask and sign in before filing. Uploads require an authenticated wallet (not a mock session).');
      return;
    }

    setUploading(true);
    setError(null);
    setVerifyResult(null);
    setAuditLogs(null);
    setUploadResult(null);
    advanceStep('select');

    try {
      advanceStep('encrypt');
      let classifyRes = { data: null };
      try {
         classifyRes = await api.classifyDocument(selectedFile);
      } catch {
        /* optional */
      }
      
      const predictedType = classifyRes.data?.documentType || docType;
      advanceStep('ipfs');
      const uploadRes = await api.uploadDocument(selectedFile, caseId.trim(), predictedType);

      advanceStep('chain');
      advanceStep('meta');
      advanceStep('audit');
      advanceStep('done');

      setUploadResult({
        docId: uploadRes.doc_id,
        caseId: uploadRes.case_id,
        docType: uploadRes.doc_type,
        ipfsCid: uploadRes.ipfs_cid,
        documentHash: uploadRes.document_hash,
        status: uploadRes.status,
        txHash: uploadRes.tx_hash || null,
        keyVersion: uploadRes.key_version,
        uploadedBy: uploadRes.uploaded_by || walletAddress || displayName,
        createdAt: uploadRes.created_at,
        classification: classifyRes.data || { documentType: predictedType },
      });
    } catch (err) {
      setUploadStep(null);
      setError(
        err.response?.data?.detail?.error
          || err.response?.data?.error
          || err.message
          || 'Failed to secure document.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleShareDoc = async (e) => {
    e.preventDefault();
    if (!shareWallet.trim()) return;
    if (!uploadResult?.docId) {
      setError('Secure a document before granting access.');
      return;
    }
    try {
      await api.shareDocument(uploadResult.docId, shareWallet.trim());
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 4000);
    } catch (err) {
      setError(err.response?.data?.detail?.error || err.message || 'Failed to grant access.');
    }
  };

  const handleDownload = async () => {
    if (!uploadResult?.docId) return;
    setDownloading(true);
    setError(null);
    try {
      await api.downloadDocument(uploadResult.docId);
    } catch (err) {
      setError(err.message || 'Download failed. Connect MetaMask with the uploader wallet.');
    } finally {
      setDownloading(false);
    }
  };

  const handleVerify = async () => {
    if (!uploadResult?.docId) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await api.verifyDocument(uploadResult.docId);
      setVerifyResult(result);
    } catch (err) {
      setError(err.response?.data?.detail?.error || err.message || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleViewAudit = async () => {
    if (!uploadResult?.docId) return;
    setError(null);
    try {
      const res = await api.getAuditByDocument(uploadResult.docId);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAuditLogs(list);
    } catch (err) {
      setError(err.message || 'Could not load audit trail.');
    }
  };

  const stepIndex = UPLOAD_STEPS.findIndex((s) => s.id === uploadStep);

  return (
    <div className="space-y-6">
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <FileText size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">
              Advocate workspace
            </span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">
              {displayName} — Legal Vault Filing
            </h2>
            <p className="text-xs text-paper-muted font-body">
              Bar Council Reg: <strong className="text-paper-ink font-mono">{bar}</strong>
              {' · '}Role: <strong className="text-paper-rust">{role}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="border-b border-paper-border pb-3">
            <span className="text-[10px] text-paper-rust font-bold uppercase tracking-wider font-mono">
              Secure archival
            </span>
            <h3 className="font-heading text-lg font-bold text-paper-ink mt-0.5">
              Encrypt & register legal record
            </h3>
            <p className="text-xs text-paper-muted font-body mt-1">
              PDF encrypted server-side with AES-256-GCM before IPFS storage. Only metadata is registered on Sepolia.
            </p>
          </div>

          <form onSubmit={handleUploadAndEncrypt} className="space-y-4 font-body text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                  Associated case ID
                </label>
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="CASE-…"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink"
                />
              </div>
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                  Document category
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                >
                  <option value="Bail Order">Bail Order</option>
                  <option value="FIR">FIR Record</option>
                  <option value="Judgment">Judicial Judgment</option>
                  <option value="Charge Sheet">Charge Sheet</option>
                  <option value="Affidavit">Affidavit</option>
                </select>
              </div>
            </div>

            <div className="border border-dashed border-paper-border hover:border-paper-ink p-8 text-center bg-paper-bg transition cursor-pointer relative rounded-sm">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadSimple size={32} weight="bold" className="text-paper-rust mx-auto mb-2" />
              <p className="font-heading text-sm font-bold text-paper-ink">
                {selectedFile ? selectedFile.name : 'Select PDF for secure archival'}
              </p>
              <p className="text-[11px] text-paper-muted mt-1">
                {selectedFile
                  ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                  : 'Server-side AES-256-GCM → IPFS ciphertext → Sepolia metadata'}
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="btn-editorial-rust font-heading w-full"
            >
              {uploading ? <ArrowsClockwise size={16} className="animate-spin" /> : <LockKey size={16} weight="bold" />}
              <span>{uploading ? 'SECURING DOCUMENT…' : 'SECURE & REGISTER DOCUMENT'}</span>
            </button>
          </form>

          {uploading && (
            <ol className="space-y-1.5 border border-paper-border bg-paper-surface p-3 rounded-sm">
              {UPLOAD_STEPS.map((s, i) => {
                const active = s.id === uploadStep;
                const done = stepIndex > i;
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-2 text-[11px] ${
                      active ? 'text-paper-ink font-semibold' : done ? 'text-emerald-800' : 'text-paper-muted'
                    }`}
                  >
                    {done ? <CheckCircle size={14} weight="fill" className="text-emerald-700" /> : active ? <ArrowsClockwise size={14} className="animate-spin" /> : <Clock size={14} />}
                    <span>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {uploadResult && (
            <div className="bg-paper-surface border border-paper-ink p-5 rounded-sm space-y-4">
              <div className="flex items-center space-x-1.5 font-heading font-bold text-emerald-900 text-sm">
                <CheckCircle size={18} weight="fill" />
                <span>DOCUMENT REGISTERED</span>
              </div>

              <p className="font-mono text-lg font-bold text-paper-rust tracking-tight">{uploadResult.docId}</p>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="text-paper-muted uppercase text-[10px]">Case</dt>
                  <dd className="font-mono text-paper-ink">{uploadResult.caseId}</dd>
                </div>
                <div>
                  <dt className="text-paper-muted uppercase text-[10px]">Document type</dt>
                  <dd className="text-paper-ink">{uploadResult.docType}</dd>
                </div>
                <div>
                  <dt className="text-paper-muted uppercase text-[10px]">Uploaded by</dt>
                  <dd className="text-paper-ink truncate">{uploadResult.uploadedBy}</dd>
                </div>
                <div>
                  <dt className="text-paper-muted uppercase text-[10px]">Created</dt>
                  <dd className="font-mono text-paper-ink">
                    {uploadResult.createdAt ? String(uploadResult.createdAt).replace('T', ' ').slice(0, 19) : '—'}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-paper-border pt-3 space-y-2 text-xs">
                <p className="text-[10px] uppercase font-bold text-paper-muted tracking-wide">Security</p>
                <p><span className="text-paper-muted">Encryption:</span> AES-256-GCM (server-side)</p>
                <p className="break-all"><span className="text-paper-muted">IPFS CID:</span> <span className="font-mono">{uploadResult.ipfsCid}</span></p>
                {uploadResult.documentHash && (
                  <p className="break-all"><span className="text-paper-muted">Integrity hash:</span> <span className="font-mono">{uploadResult.documentHash}</span></p>
                )}
                <p><span className="text-paper-muted">Blockchain:</span> Sepolia</p>
                <p className="break-all">
                  <span className="text-paper-muted">Transaction:</span>{' '}
                  <span className="font-mono">
                    {uploadResult.txHash || '—'}
                  </span>
                </p>
                <p>
                  <span className="text-paper-muted">Status:</span>{' '}
                  {uploadResult.status === 'VERIFIED_BLOCKCHAIN'
                    ? 'Integrity metadata registered on Sepolia'
                    : uploadResult.status}
                </p>
                {uploadResult.status === 'PENDING_CHAIN' && (
                  <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-300 p-2 rounded-sm font-body">
                    Encrypted IPFS archival succeeded, but Sepolia registration is pending.
                    The service wallet needs Sepolia ETH (and a contract role) for live chain writes.
                    Document remains encrypted and downloadable; integrity is UNVERIFIED until anchored.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={handleDownload} disabled={downloading} className="btn-editorial font-heading text-[11px]">
                  {downloading ? <ArrowsClockwise size={14} className="animate-spin" /> : <DownloadSimple size={14} weight="bold" />}
                  <span>Download</span>
                </button>
                <button type="button" onClick={handleVerify} disabled={verifying} className="btn-editorial font-heading text-[11px]">
                  {verifying ? <ArrowsClockwise size={14} className="animate-spin" /> : <ShieldCheck size={14} weight="bold" />}
                  <span>Verify integrity</span>
                </button>
                <button type="button" onClick={() => document.getElementById('grant-access-panel')?.scrollIntoView({ behavior: 'smooth' })} className="btn-editorial font-heading text-[11px]">
                  <ShareNetwork size={14} weight="bold" />
                  <span>Grant access</span>
                </button>
                <button type="button" onClick={handleViewAudit} className="btn-editorial font-heading text-[11px]">
                  <ShieldCheck size={14} weight="bold" />
                  <span>View audit trail</span>
                </button>
              </div>

              {verifyResult && (
                <div className="border border-paper-border bg-paper-card p-3 rounded-sm space-y-1 text-[11px] font-mono">
                  <p className="font-heading font-bold text-xs uppercase tracking-wide text-paper-ink mb-2">Document integrity</p>
                  <p>CID MATCH {verifyResult.cidMatch == null ? '—' : verifyResult.cidMatch ? '✓' : '✗'}</p>
                  <p>HASH MATCH {verifyResult.hashMatch == null ? '—' : verifyResult.hashMatch ? '✓' : '✗'}</p>
                  <p>BLOCKCHAIN {verifyResult.blockchainVerified ? '✓' : '✗'}</p>
                  <p className="pt-1 font-heading text-paper-rust">STATUS {verifyResult.integrity || verifyResult.status}</p>
                  {verifyResult.error && <p className="font-body text-paper-muted text-[10px]">{verifyResult.error}</p>}
                </div>
              )}

              {auditLogs && (
                <div className="border border-paper-border bg-paper-card p-3 rounded-sm max-h-40 overflow-auto text-[11px]">
                  <p className="font-heading font-bold text-xs uppercase mb-2">Audit trail</p>
                  {auditLogs.length === 0 && <p className="text-paper-muted">No audit events yet.</p>}
                  {auditLogs.map((log) => (
                    <p key={log.id || `${log.action}-${log.performedAt}`} className="font-mono text-paper-ink border-b border-paper-border/50 py-1">
                      {log.action} · {log.performedBy} · {String(log.performedAt || '').slice(0, 19)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-sm flex items-center space-x-2 text-red-800 text-xs">
              <Warning size={16} weight="bold" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div id="grant-access-panel" className="bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-3 rounded-sm">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <ShareNetwork size={18} weight="bold" className="text-paper-rust" />
              <span>Grant document access</span>
            </h3>
            <p className="text-[11px] text-paper-muted font-body leading-relaxed">
              Access is enforced by the server. Encryption keys remain protected and are never exposed to users.
            </p>
            <form onSubmit={handleShareDoc} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                  Recipient wallet address
                </label>
                <input
                  type="text"
                  value={shareWallet}
                  onChange={(e) => setShareWallet(e.target.value)}
                  placeholder="0x…"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink"
                />
              </div>
              <button type="submit" disabled={!shareWallet} className="btn-editorial font-heading w-full">
                GRANT DOCUMENT ACCESS
              </button>
            </form>
            {shareSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-sm text-emerald-950 font-bold flex items-center space-x-1.5 text-xs">
                <CheckCircle size={16} weight="fill" className="text-emerald-700" />
                <span>Access granted to {shareWallet.substring(0, 10)}…</span>
              </div>
            )}
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2 font-body text-xs text-paper-muted">
            <h4 className="font-heading font-bold text-paper-ink uppercase text-[11px]">Document service pipeline</h4>
            <p>1. PDF encrypted server-side with AES-256-GCM before IPFS storage.</p>
            <p>2. Encrypted payload pinned to IPFS via Pinata (CID = ciphertext).</p>
            <p>3. Non-sensitive metadata (CID, hash, type) registered on Sepolia.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyerDashboard;
