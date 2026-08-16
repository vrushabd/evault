import React, { useState } from 'react';
import { User, FileText, CheckCircle, Warning, QrCode, ShieldCheck, ArrowsClockwise } from '@phosphor-icons/react';
import api from '../services/api';
import { StaggerContainer, StaggerItem, FadeIn } from './common/FadeIn';

const CLIENT_DOCS = [
  { docId: 'DOC-2026-9918', caseId: 'CASE-MH-2024-001', docType: 'Bail Order', status: 'VERIFIED', ipfsCid: 'QmX9a...71b2', date: '2024-01-15' },
  { docId: 'DOC-2026-8812', caseId: 'CASE-MH-2024-001', docType: 'FIR Record', status: 'VERIFIED', ipfsCid: 'QmZ4k...90c4', date: '2024-01-10' }
];

export function ClientDashboard({ walletAddress }) {
  const [verifyDocId, setVerifyDocId] = useState('DOC-2026-9918');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const handleVerifyDoc = async (e) => {
    e.preventDefault();
    if (!verifyDocId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyDocument(verifyDocId);
      setVerifyResult({
        isTampered: result.tampered || false,
        docId: result.docId || verifyDocId,
        ipfsCid: result.ipfsCid || result.ipfs_cid || '—',
        txHash: result.txHash || result.tx_hash,
        blockchainStatus: result.tampered ? 'TAMPERED — MISMATCH DETECTED' : 'MATCHED (100% UNALTERED)',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setVerifyResult({
        isTampered: true,
        docId: verifyDocId,
        ipfsCid: '—',
        blockchainStatus: 'VERIFICATION FAILED — SERVICE UNAVAILABLE OR DOCUMENT NOT FOUND',
        timestamp: new Date().toISOString(),
        error: err.response?.data?.error || err.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      
      {/* Header */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <User size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">CITIZEN PORTAL</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">Priya Verma — My Legal Vault</h2>
            <p className="text-xs text-paper-muted font-body">
              Bound Wallet: <strong className="text-paper-ink">{walletAddress || 'Not connected'}</strong> · Role: <strong className="text-paper-rust">CLIENT</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Document List Column (7 cols) */}
        <div className="lg:col-span-7 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">My Certified Legal Records</h3>
            <span className="text-[10px] bg-paper-surface border border-paper-border px-2 py-0.5 rounded-sm font-bold">
              2 DOCUMENTS
            </span>
          </div>

          <StaggerContainer className="space-y-3">
            {CLIENT_DOCS.map((doc) => (
              <StaggerItem key={doc.docId}>
                <div className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-paper-rust">{doc.docId}</span>
                    <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                      {doc.status}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-slate-900 text-sm">{doc.docType} — {doc.caseId}</h4>
                  <div className="flex flex-wrap justify-between text-[11px] text-paper-muted pt-1 border-t border-paper-border/60">
                    <span>IPFS CID: {doc.ipfsCid}</span>
                    <span>Date: {doc.date}</span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Verification & QR Code Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Tamper Check Form */}
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <QrCode size={18} weight="bold" className="text-paper-rust" />
              <span>Verify Document Authenticity</span>
            </h3>

            <form onSubmit={handleVerifyDoc} className="space-y-3">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">ENTER DOCUMENT ID OR SCAN QR</label>
                <input
                  type="text"
                  value={verifyDocId}
                  onChange={(e) => setVerifyDocId(e.target.value)}
                  placeholder="e.g. DOC-2026-9918"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="btn-editorial-rust font-mono w-full"
              >
                {verifying ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
                <span>COMPARE IPFS CID & TAMPER CHECK</span>
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
                  <p><span className="text-paper-muted">IPFS Hash:</span> {verifyResult.ipfsCid}</p>
                  {verifyResult.txHash && <p className="truncate"><span className="text-paper-muted">TX:</span> {verifyResult.txHash}</p>}
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
