import React, { useState, useEffect } from 'react';
import { User, CheckCircle, Warning, QrCode, ShieldCheck, ArrowsClockwise } from '@phosphor-icons/react';
import api from '../services/api';
import { StaggerContainer, StaggerItem, FadeIn } from './common/FadeIn';

const DEFAULT_CASE = 'CASE-MH-2024-001';

export function ClientDashboard({ walletAddress }) {
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [verifyDocId, setVerifyDocId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [listError, setListError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDocs(true);
      setListError(null);
      try {
        const data = await api.getDocumentsByCase(DEFAULT_CASE);
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (!cancelled) {
          setDocs(list);
          if (list[0]?.doc_id || list[0]?.docId) {
            setVerifyDocId(list[0].doc_id || list[0].docId);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDocs([]);
          setListError('Could not load documents for this case. Upload one from Lawyer Filing first.');
        }
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleVerifyDoc = async (e) => {
    e.preventDefault();
    if (!verifyDocId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyDocument(verifyDocId.trim());
      const verified = result.verified !== false && !result.tampered;
      setVerifyResult({
        isTampered: !verified,
        docId: result.docId || verifyDocId,
        ipfsCid: result.ipfsCid || result.ipfs_cid || '—',
        txHash: result.txHash || result.tx_hash,
        blockchainStatus: verified
          ? 'AUTHENTIC — RECORD MATCHES VAULT'
          : 'TAMPERED OR UNVERIFIED',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err.response?.data?.detail?.error || err.response?.data?.error || err.message;
      setVerifyResult({
        isTampered: true,
        docId: verifyDocId,
        ipfsCid: '—',
        blockchainStatus: 'DOCUMENT NOT FOUND',
        timestamp: new Date().toISOString(),
        error: msg,
      });
    } finally {
      setVerifying(false);
    }
  };

  const selectDoc = (doc) => {
    const id = doc.doc_id || doc.docId;
    setVerifyDocId(id);
    setVerifyResult(null);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <User size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">CITIZEN PORTAL</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">My Legal Vault</h2>
            <p className="text-xs text-paper-muted font-body">
              Bound Wallet: <strong className="text-paper-ink">{walletAddress || 'Not connected'}</strong>
              {' · '}Role: <strong className="text-paper-rust">CLIENT</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">My Certified Legal Records</h3>
            <span className="text-[10px] bg-paper-surface border border-paper-border px-2 py-0.5 rounded-sm font-bold">
              {docs.length} DOCUMENT{docs.length === 1 ? '' : 'S'}
            </span>
          </div>

          {loadingDocs && <p className="text-paper-muted text-[11px]">Loading documents…</p>}
          {listError && <p className="text-paper-muted text-[11px]">{listError}</p>}

          {!loadingDocs && docs.length === 0 && !listError && (
            <p className="text-paper-muted text-[11px]">
              No documents for {DEFAULT_CASE} yet. Upload a PDF from Lawyer Filing, then return here to verify.
            </p>
          )}

          <StaggerContainer className="space-y-3">
            {docs.map((doc) => {
              const id = doc.doc_id || doc.docId;
              const selected = verifyDocId === id;
              return (
                <StaggerItem key={id}>
                  <button
                    type="button"
                    onClick={() => selectDoc(doc)}
                    className={`w-full text-left bg-paper-surface border p-4 rounded-sm space-y-2 transition ${
                      selected ? 'border-paper-ink shadow-offset-sm' : 'border-paper-border hover:border-paper-ink'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-paper-rust">{id}</span>
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                        {doc.status || 'STORED'}
                      </span>
                    </div>
                    <h4 className="font-heading font-bold text-paper-ink text-sm">
                      {doc.doc_type || doc.docType} — {doc.case_id || doc.caseId}
                    </h4>
                    <div className="flex flex-wrap justify-between text-[11px] text-paper-muted pt-1 border-t border-paper-border/60">
                      <span className="truncate max-w-[70%]">IPFS: {doc.ipfs_cid || doc.ipfsCid || '—'}</span>
                      <span>{doc.created_at ? String(doc.created_at).slice(0, 10) : ''}</span>
                    </div>
                  </button>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <QrCode size={18} weight="bold" className="text-paper-rust" />
              <span>Verify Document Authenticity</span>
            </h3>

            <p className="text-[11px] text-paper-muted font-body">
              Select a record on the left, or paste a document ID from an upload receipt.
            </p>

            <form onSubmit={handleVerifyDoc} className="space-y-3">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">DOCUMENT ID</label>
                <input
                  type="text"
                  value={verifyDocId}
                  onChange={(e) => { setVerifyDocId(e.target.value); setVerifyResult(null); }}
                  placeholder="e.g. DOC-XXXXXXXX"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink font-mono"
                />
              </div>

              <button type="submit" disabled={verifying || !verifyDocId.trim()} className="btn-editorial-rust font-mono w-full">
                {verifying ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
                <span>{verifying ? 'VERIFYING…' : 'VERIFY AUTHENTICITY'}</span>
              </button>
            </form>

            {verifyResult && (
              <FadeIn>
                <div className={`border p-3.5 rounded-sm space-y-1 ${
                  verifyResult.isTampered
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : 'bg-paper-surface border-paper-border text-paper-ink'
                }`}>
                  <div className="flex items-center space-x-1.5 font-bold">
                    {verifyResult.isTampered
                      ? <Warning size={16} weight="fill" className="text-red-700" />
                      : <CheckCircle size={16} weight="fill" className="text-emerald-700" />}
                    <span>{verifyResult.blockchainStatus}</span>
                  </div>
                  <p><span className="text-paper-muted">Doc ID:</span> {verifyResult.docId}</p>
                  <p className="break-all"><span className="text-paper-muted">IPFS:</span> {verifyResult.ipfsCid}</p>
                  {verifyResult.txHash && <p className="truncate"><span className="text-paper-muted">TX:</span> {verifyResult.txHash}</p>}
                  {verifyResult.error && <p className="text-[10px] opacity-80">{verifyResult.error}</p>}
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;
