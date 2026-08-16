import React, { useState, useEffect } from 'react';
import { User, CheckCircle, Warning, QrCode, ShieldCheck, ArrowsClockwise, DownloadSimple } from '@phosphor-icons/react';
import api from '../services/api';
import { StaggerContainer, StaggerItem, FadeIn } from './common/FadeIn';

const DEFAULT_CASE = 'CASE-MH-2024-001';

const DOWNLOAD_PHASES = [
  'Authorizing access…',
  'Retrieving encrypted record…',
  'Decrypting securely…',
  'Preparing download…',
];

export function ClientDashboard({ walletAddress }) {
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [verifyDocId, setVerifyDocId] = useState('');
  const [caseId, setCaseId] = useState(DEFAULT_CASE);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [listError, setListError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadPhase, setDownloadPhase] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  const loadDocs = async (cid) => {
    setLoadingDocs(true);
    setListError(null);
    try {
      const data = await api.getDocumentsByCase(cid);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setDocs(list);
      if (list[0]?.doc_id || list[0]?.docId) {
        setVerifyDocId(list[0].doc_id || list[0].docId);
      }
    } catch {
      setDocs([]);
      setListError('Could not load documents for this case. Ensure you are authorized and the case has filings.');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocs(caseId);
  }, [caseId]);

  const handleVerifyDoc = async (e) => {
    e.preventDefault();
    if (!verifyDocId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyDocument(verifyDocId.trim());
      const verified = result.verified === true || result.integrity === 'VALID';
      setVerifyResult({
        isTampered: !verified,
        docId: result.documentId || result.docId || verifyDocId,
        caseId: result.caseId,
        ipfsCid: result.ipfsCid || '—',
        documentHash: result.documentHash,
        txHash: result.txHash,
        integrity: result.integrity,
        cidMatch: result.cidMatch,
        hashMatch: result.hashMatch,
        blockchainVerified: result.blockchainVerified,
        statusLabel: verified ? 'AUTHENTIC' : (result.integrity || result.status || 'UNVERIFIED'),
        error: result.error,
      });
    } catch (err) {
      setVerifyResult({
        isTampered: true,
        docId: verifyDocId,
        ipfsCid: '—',
        statusLabel: 'NOT FOUND',
        error: err.response?.data?.detail?.error || err.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  const selectDoc = (doc) => {
    setVerifyDocId(doc.doc_id || doc.docId);
    setVerifyResult(null);
    setDownloadError(null);
  };

  const handleDownload = async (docId, e) => {
    if (e) e.stopPropagation();
    const id = (docId || verifyDocId || '').trim();
    if (!id) return;
    setDownloadingId(id);
    setDownloadError(null);
    let phaseIdx = 0;
    setDownloadPhase(DOWNLOAD_PHASES[0]);
    const timer = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, DOWNLOAD_PHASES.length - 1);
      setDownloadPhase(DOWNLOAD_PHASES[phaseIdx]);
    }, 450);
    try {
      await api.downloadDocument(id);
    } catch (err) {
      setDownloadError(
        err.message
          || 'Download failed. You must be the original uploader or have been granted access to this document.'
      );
    } finally {
      clearInterval(timer);
      setDownloadPhase(null);
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <User size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">Citizen portal</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">My Legal Vault</h2>
            <p className="text-xs text-paper-muted font-body">
              Bound Wallet: <strong className="text-paper-ink font-mono">{walletAddress || 'Not connected'}</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">My documents</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="bg-paper-bg border border-paper-border rounded-sm px-2 py-1.5 text-[11px] font-mono w-44"
                placeholder="Case ID"
              />
              <button type="button" onClick={() => loadDocs(caseId)} className="btn-editorial text-[11px] font-heading">
                Load
              </button>
            </div>
          </div>

          {loadingDocs && <p className="text-paper-muted text-[11px] font-body">Loading documents…</p>}
          {listError && <p className="text-paper-muted text-[11px] font-body">{listError}</p>}

          <StaggerContainer className="space-y-3">
            {docs.map((doc) => {
              const id = doc.doc_id || doc.docId;
              const selected = verifyDocId === id;
              const isDownloading = downloadingId === id;
              return (
                <StaggerItem key={id}>
                  <div
                    className={`w-full text-left bg-paper-surface border p-4 rounded-sm space-y-2 transition ${
                      selected ? 'border-paper-ink shadow-offset-sm' : 'border-paper-border hover:border-paper-ink'
                    }`}
                  >
                    <button type="button" onClick={() => selectDoc(doc)} className="w-full text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-paper-rust">{id}</span>
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                          {doc.status || 'STORED'}
                        </span>
                      </div>
                      <h4 className="font-heading font-bold text-paper-ink text-sm">
                        {doc.doc_type || doc.docType} — <span className="font-mono text-xs">{doc.case_id || doc.caseId}</span>
                      </h4>
                    </button>
                    <p className="text-[10px] text-paper-muted font-body">Secure download — authorization required.</p>
                    <button
                      type="button"
                      onClick={(e) => handleDownload(id, e)}
                      disabled={!!downloadingId}
                      className="btn-editorial font-heading w-full text-[11px]"
                    >
                      {isDownloading ? <ArrowsClockwise size={14} className="animate-spin" /> : <DownloadSimple size={14} weight="bold" />}
                      <span>{isDownloading ? (downloadPhase || 'Downloading…') : 'DOWNLOAD DOCUMENT'}</span>
                    </button>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <QrCode size={18} weight="bold" className="text-paper-rust" />
              <span>Document integrity</span>
            </h3>
            <p className="text-[11px] text-paper-muted font-body">
              Verifies MySQL metadata against Sepolia without downloading or decrypting the PDF.
            </p>

            <form onSubmit={handleVerifyDoc} className="space-y-3">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">Document ID</label>
                <input
                  type="text"
                  value={verifyDocId}
                  onChange={(e) => { setVerifyDocId(e.target.value); setVerifyResult(null); }}
                  placeholder="DOC-…"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink"
                />
              </div>
              <button type="submit" disabled={verifying || !verifyDocId.trim()} className="btn-editorial-rust font-heading w-full">
                {verifying ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
                <span>{verifying ? 'VERIFYING…' : 'VERIFY INTEGRITY'}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => handleDownload(verifyDocId)}
              disabled={!verifyDocId.trim() || !!downloadingId}
              className="btn-editorial font-heading w-full"
            >
              {downloadingId === verifyDocId.trim()
                ? <ArrowsClockwise size={16} className="animate-spin" />
                : <DownloadSimple size={16} weight="bold" />}
              <span>
                {downloadingId === verifyDocId.trim()
                  ? (downloadPhase || 'Downloading…')
                  : 'DOWNLOAD DOCUMENT'}
              </span>
            </button>
            <p className="text-[10px] text-paper-muted font-body">Secure download — authorization required.</p>

            {downloadError && (
              <p className="text-[11px] text-red-800 bg-red-50 border border-red-300 p-2 rounded-sm">{downloadError}</p>
            )}

            {verifyResult && (
              <FadeIn>
                <div className={`border p-3.5 rounded-sm space-y-1.5 font-mono text-[11px] ${
                  verifyResult.isTampered
                    ? 'bg-red-50 border-red-300 text-red-900'
                    : 'bg-paper-surface border-paper-border text-paper-ink'
                }`}>
                  <p className="font-heading font-bold text-xs uppercase tracking-wide mb-2">Document integrity</p>
                  <p>Document ID <span className="float-right">{verifyResult.docId}</span></p>
                  <p className="break-all clear-both">IPFS CID <span className="block mt-0.5">{verifyResult.ipfsCid}</span></p>
                  {verifyResult.txHash && <p className="break-all">Blockchain TX <span className="block mt-0.5">{verifyResult.txHash}</span></p>}
                  <p>CID MATCH <span className="float-right">{verifyResult.cidMatch == null ? '—' : verifyResult.cidMatch ? '✓' : '✗'}</span></p>
                  <p>HASH MATCH <span className="float-right">{verifyResult.hashMatch == null ? '—' : verifyResult.hashMatch ? '✓' : '✗'}</span></p>
                  <p>BLOCKCHAIN <span className="float-right">{verifyResult.blockchainVerified ? '✓' : '✗'}</span></p>
                  <p className="pt-2 font-heading font-bold text-paper-rust clear-both">
                    STATUS {verifyResult.statusLabel}
                  </p>
                  {verifyResult.error && <p className="text-[10px] opacity-80 font-body">{verifyResult.error}</p>}
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
