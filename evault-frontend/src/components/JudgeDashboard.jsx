import React, { useState } from 'react';
import { Scales, Gavel, FileText, CheckCircle, Warning, Eye, Key, ShieldCheck, ShareNetwork, ArrowsClockwise } from '@phosphor-icons/react';
import { StaggerContainer, StaggerItem, FadeIn } from './common/FadeIn';

const JUDGE_CASES = [
  { caseId: 'CASE-MH-2024-001', title: 'State of Maharashtra vs. Ramesh Sharma', docType: 'Bail Order', status: 'HEARING', filingDate: '2024-01-15', cid: 'QmX9a...71b2', docsCount: 4 },
  { caseId: 'CASE-DL-2024-001', title: 'M/S TechCorp India vs. Union of India', docType: 'Judgment', status: 'RESERVED', filingDate: '2024-02-10', cid: 'QmZ4k...90c4', docsCount: 6 },
  { caseId: 'CASE-KA-2024-001', title: 'Ananya Rao vs. K.V. Venkatesh', docType: 'Evidence', status: 'ACTIVE', filingDate: '2024-03-05', cid: 'QmP8c...33e1', docsCount: 2 }
];

export function JudgeDashboard() {
  const [selectedCase, setSelectedCase] = useState(JUDGE_CASES[0]);
  const [signedOrder, setSignedOrder] = useState('');
  const [signing, setSigning] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  const handleSignOrder = (e) => {
    e.preventDefault();
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      setSignSuccess(true);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Judge Header */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <Gavel size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">JUDICIAL OFFICER DASHBOARD</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">Hon. Justice S. Mehta — Bench Portal</h2>
            <p className="text-xs text-paper-muted font-body">
              Court Jurisdiction: <strong className="text-paper-ink">Mumbai High Court</strong> · Role: <strong className="text-paper-rust">JUDGE</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Case List Column (5 cols) */}
        <div className="lg:col-span-5 bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">Assigned Case Dockets</h3>
            <span className="text-[10px] bg-paper-surface border border-paper-border px-2 py-0.5 rounded-sm font-bold">
              3 ACTIVE
            </span>
          </div>

          <StaggerContainer className="space-y-2">
            {JUDGE_CASES.map((item) => (
              <StaggerItem key={item.caseId}>
                <div
                  onClick={() => { setSelectedCase(item); setSignSuccess(false); }}
                  className={`p-3 rounded-sm border transition cursor-pointer ${
                    selectedCase.caseId === item.caseId
                      ? 'bg-paper-surface border-paper-ink shadow-offset-sm'
                      : 'bg-paper-card border-paper-border hover:border-paper-ink'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-paper-rust">{item.caseId}</span>
                    <span className="text-[10px] bg-paper-card border border-paper-border px-2 py-0.5 font-bold">
                      {item.status}
                    </span>
                  </div>
                  <p className="font-heading font-bold text-slate-900 text-xs mt-1">{item.title}</p>
                  <div className="flex justify-between text-[10px] text-paper-muted mt-2">
                    <span>IPFS CID: {item.cid}</span>
                    <span>{item.docsCount} Documents</span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* Selected Case Workspace (7 cols) */}
        <div className="lg:col-span-7 bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-5">
          
          <div className="border-b border-paper-border pb-3">
            <span className="text-[10px] font-mono text-paper-rust font-bold uppercase">{selectedCase.caseId}</span>
            <h3 className="font-heading text-lg font-bold text-paper-ink tracking-tight mt-0.5">{selectedCase.title}</h3>
            <p className="text-xs text-paper-muted font-mono mt-1">Filing Date: {selectedCase.filingDate} · IPFS CID: {selectedCase.cid}</p>
          </div>

          {/* Cryptographic Order Signing Form */}
          <div className="space-y-3 font-mono text-xs">
            <span className="text-[10px] font-bold text-paper-muted uppercase">ISSUE & CRYPTOGRAPHICALLY SIGN JUDICIAL ORDER</span>
            
            <form onSubmit={handleSignOrder} className="space-y-3">
              <textarea
                value={signedOrder}
                onChange={(e) => setSignedOrder(e.target.value)}
                rows={4}
                placeholder="Enter judicial order text (e.g. Bail Application Granted under Section 439 CrPC upon furnishing personal bond of Rs 50,000)..."
                className="w-full bg-paper-bg border border-paper-border rounded-sm p-3 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink"
              />

              <button
                type="submit"
                disabled={signing || !signedOrder.trim()}
                className="btn-editorial-rust font-mono"
              >
                {signing ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
                <span>{signing ? 'SIGNING ON BLOCKCHAIN...' : 'CRYPTOGRAPHICALLY SIGN & ATTACH ORDER'}</span>
              </button>
            </form>

            {signSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-sm text-emerald-950 flex items-center space-x-2">
                <CheckCircle size={18} weight="fill" className="text-emerald-700 flex-shrink-0" />
                <div>
                  <p className="font-bold text-xs">Order Signed & Pinned to Blockchain</p>
                  <p className="text-[11px] text-emerald-800">TX Hash: 0x9f31a2...c80b · Smart Contract State Updated</p>
                </div>
              </div>
            )}
          </div>

          {/* Document Access History */}
          <FadeIn delay={0.2} className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2 font-mono text-xs">
            <span className="text-[10px] font-bold text-paper-muted uppercase">ACCESS AUDIT PERMISSIONS</span>
            <div className="space-y-1 text-[11px] text-paper-ink">
              <p>✔ Adv. Ramesh Sharma (LAWYER) — Uploaded Initial Motion (IPFS: QmX9a...)</p>
              <p>✔ Hon. Justice S. Mehta (JUDGE) — Read & Verified AES-256 Key</p>
            </div>
          </FadeIn>

        </div>

      </div>

    </div>
  );
}
export default JudgeDashboard;
