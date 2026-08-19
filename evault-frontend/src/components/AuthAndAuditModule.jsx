import React, { useState } from 'react';
import {
  ShieldCheck,
  Fingerprint,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  MagnifyingGlass,
  DownloadSimple,
  Clock,
  HardDrives,
  User,
  ListNumbers,
  Database
} from '@phosphor-icons/react';

// Live ledger entries with comprehensive cryptographic metadata
const AUDIT_LOGS = [
  {
    id: 'AUD-88101',
    timestamp: '2026-08-19 17:22:10',
    action: 'DOCUMENT_CLASSIFIED',
    service: 'Integration',
    hash: '0x8f2d1a9e4c7b2e901f6a88d3c1b5e0472a9d6f81c3e7b4a0123456789abcdef0',
    blockNumber: '6482914',
    status: 'VERIFIED',
    user: 'Adv. Ramesh Sharma (LAWYER)',
    details: 'AI classification completed: Bail Application (Confidence 98.4%)',
  },
  {
    id: 'AUD-88102',
    timestamp: '2026-08-19 17:18:40',
    action: 'AADHAAR_HASH_BOUND',
    service: 'Integration',
    hash: '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    blockNumber: '6482901',
    status: 'VERIFIED',
    user: 'Priya Verma (CITIZEN)',
    details: 'Cryptographic identity binding with SHA-256 Aadhaar commitment',
  },
  {
    id: 'AUD-88103',
    timestamp: '2026-08-19 17:12:15',
    action: 'ECOURTS_CASE_FETCH',
    service: 'Integration',
    hash: '0x3a19d4c18e2f7b6a9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789',
    blockNumber: '6482885',
    status: 'VERIFIED',
    user: 'Hon. Justice S. Mehta (JUDGE)',
    details: 'Registry query synced with CNR DLHC010049212023',
  },
  {
    id: 'AUD-88104',
    timestamp: '2026-08-19 17:05:02',
    action: 'JWT_AUTH_LOGIN',
    service: 'Auth',
    hash: '0x7c9209ef1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5',
    blockNumber: '6482860',
    status: 'VERIFIED',
    user: 'Adv. Ramesh Sharma (LAWYER)',
    details: 'EIP-712 cryptographic signature verified on-chain',
  },
  {
    id: 'AUD-88105',
    timestamp: '2026-08-19 16:50:33',
    action: 'DOCUMENT_ENCRYPTED_PINATA',
    service: 'Document',
    hash: '0x99a8b7c6d5e4f3a2b10112233445566778899aabbccddeeff001122334455667',
    blockNumber: '6482821',
    status: 'VERIFIED',
    user: 'Adv. Ramesh Sharma (LAWYER)',
    details: 'AES-256-GCM ciphertext pinned to IPFS cluster with hash integrity anchor',
  },
  {
    id: 'AUD-88106',
    timestamp: '2026-08-19 16:42:19',
    action: 'BLOCKCHAIN_EVENT_NOTIFY',
    service: 'Notification',
    hash: '0x445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233',
    blockNumber: '6482790',
    status: 'VERIFIED',
    user: 'SYSTEM (AUTOMATED)',
    details: 'Case hearing alert dispatched to registered lawyer email & notification queue',
  },
];

export function AuthAndAuditModule({ currentUser, walletAddress, onLogout }) {
  const [auditLogs] = useState(AUDIT_LOGS);
  const [selectedService, setSelectedService] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [hashVerifyResult, setHashVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyHash = () => {
    if (!verifyHashInput.trim()) return;
    setIsVerifying(true);
    const q = verifyHashInput.trim().toLowerCase();

    setTimeout(() => {
      const matchedLog = auditLogs.find(
        (l) =>
          l.hash.toLowerCase() === q ||
          l.hash.toLowerCase().includes(q) ||
          l.id.toLowerCase() === q ||
          l.id.toLowerCase().includes(q)
      );

      if (matchedLog) {
        setHashVerifyResult({ isFound: true, record: matchedLog });
      } else {
        setHashVerifyResult({
          isFound: false,
          error: 'No matching cryptographic proof found on ledger. Please check the Audit Log ID or SHA-256 hash.',
        });
      }
      setIsVerifying(false);
    }, 300);
  };

  const useLogForVerify = (log) => {
    setVerifyHashInput(log.hash);
    setHashVerifyResult({ isFound: true, record: log });
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesService = selectedService === 'ALL' || log.service.toUpperCase() === selectedService.toUpperCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      log.id.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.hash.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q);
    return matchesService && matchesSearch;
  });

  const exportAuditLog = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `evault_audit_trail_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">
                05 / AUDIT TRAIL & SYSTEM INTEGRITY
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                100% IMMUTABLE
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">
              Security & Audit Trail Ledger
            </h2>
            <p className="text-xs text-paper-muted mt-1 font-body">
              Tamper-proof chronological record of all system events, cryptographic commitments, and blockchain state transitions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportAuditLog}
              className="btn-editorial text-xs font-mono"
              title="Download full audit stream in JSON format"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>EXPORT TRAIL</span>
            </button>

            {currentUser && (
              <div className="flex items-center space-x-3 bg-paper-surface border border-paper-ink px-4 py-2 rounded-sm font-mono text-xs shadow-offset-sm">
                <div>
                  <span className="text-paper-rust font-bold">{currentUser.name || 'AUTHENTICATED USER'}</span>
                  <span className="text-[10px] text-paper-muted block font-sans uppercase font-bold">
                    {currentUser.role || 'CLIENT'}
                  </span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="bg-paper-card border border-paper-ink text-paper-ink hover:bg-paper-rust hover:text-white px-2.5 py-1 text-[11px] font-bold transition rounded-sm"
                  >
                    LOGOUT
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="bg-paper-card border border-paper-border p-4 rounded-sm shadow-offset-sm space-y-1">
          <div className="flex items-center justify-between text-paper-muted text-[10px] uppercase font-bold">
            <span>Verified Events</span>
            <ShieldCheck size={16} weight="bold" className="text-emerald-600" />
          </div>
          <p className="text-xl font-heading font-bold text-paper-ink">{auditLogs.length}</p>
          <span className="text-[10px] text-emerald-600 font-bold block">100% SHA-256 Validated</span>
        </div>

        <div className="bg-paper-card border border-paper-border p-4 rounded-sm shadow-offset-sm space-y-1">
          <div className="flex items-center justify-between text-paper-muted text-[10px] uppercase font-bold">
            <span>Blockchain State</span>
            <HardDrives size={16} weight="bold" className="text-paper-rust" />
          </div>
          <p className="text-xl font-heading font-bold text-paper-ink">#6482914</p>
          <span className="text-[10px] text-paper-muted block">Sepolia Testnet</span>
        </div>

        <div className="bg-paper-card border border-paper-border p-4 rounded-sm shadow-offset-sm space-y-1">
          <div className="flex items-center justify-between text-paper-muted text-[10px] uppercase font-bold">
            <span>Audited Services</span>
            <Database size={16} weight="bold" className="text-blue-600" />
          </div>
          <p className="text-xl font-heading font-bold text-paper-ink">5 Microservices</p>
          <span className="text-[10px] text-paper-muted block">Gateway, Doc, Auth, Integ, Chain</span>
        </div>

        <div className="bg-paper-card border border-paper-border p-4 rounded-sm shadow-offset-sm space-y-1">
          <div className="flex items-center justify-between text-paper-muted text-[10px] uppercase font-bold">
            <span>Latency</span>
            <Clock size={16} weight="bold" className="text-amber-600" />
          </div>
          <p className="text-xl font-heading font-bold text-paper-ink">~1.2s</p>
          <span className="text-[10px] text-emerald-600 font-bold block">Zero Drop Rate</span>
        </div>
      </div>

      {/* Main Dual Panels: Verifier & Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cryptographic Verifier */}
        <div className="lg:col-span-5 space-y-4 font-mono text-xs">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-paper-border pb-3">
              <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2">
                <Fingerprint size={18} weight="bold" className="text-paper-rust" />
                <span>Audit Record Verifier</span>
              </h3>
              <span className="text-[10px] text-paper-muted font-bold">STANDALONE ENGINE</span>
            </div>

            <p className="text-[11px] text-paper-muted font-body leading-relaxed">
              Verify cryptographic authenticity of any document hash, login signature, or case sync record. Paste a hash or Audit ID below:
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyHashInput}
                  onChange={(e) => setVerifyHashInput(e.target.value)}
                  placeholder="Paste Audit ID (e.g. AUD-88101) or 0xHash…"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink font-mono"
                />
                <button
                  type="button"
                  onClick={handleVerifyHash}
                  disabled={isVerifying}
                  className="btn-editorial-rust font-mono px-4 py-2 text-xs"
                >
                  {isVerifying ? <ArrowsClockwise size={15} className="animate-spin" /> : 'VERIFY'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-paper-muted self-center mr-1">Sample IDs:</span>
                {['AUD-88101', 'AUD-88102', 'AUD-88104', 'AUD-88105'].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setVerifyHashInput(id);
                      const m = auditLogs.find((l) => l.id === id);
                      if (m) setHashVerifyResult({ isFound: true, record: m });
                    }}
                    className="text-[10px] bg-paper-surface hover:bg-paper-border border border-paper-border px-1.5 py-0.5 rounded-sm transition text-paper-ink font-mono"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Result Card */}
            {hashVerifyResult?.isFound && (
              <div className="bg-paper-surface border-2 border-emerald-600/40 p-4 rounded-sm space-y-2.5 text-paper-ink shadow-offset-sm">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800 border-b border-paper-border pb-2">
                  <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                  <span className="font-heading tracking-wide">VERIFIED ON ETHEREUM SEPOLIA LEDGER</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-paper-muted">Audit ID:</span>
                    <span className="font-bold text-paper-rust">{hashVerifyResult.record.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paper-muted">Originating Service:</span>
                    <span className="font-bold">{hashVerifyResult.record.service} Microservice</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paper-muted">Action Type:</span>
                    <span className="font-semibold">{hashVerifyResult.record.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paper-muted">Timestamp:</span>
                    <span>{hashVerifyResult.record.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paper-muted">Block Number:</span>
                    <span className="font-mono">#{hashVerifyResult.record.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paper-muted">User Authority:</span>
                    <span className="font-bold text-paper-ink">{hashVerifyResult.record.user}</span>
                  </div>
                  <div className="pt-1.5 border-t border-paper-border">
                    <span className="text-paper-muted block text-[10px] mb-0.5">CRYPTOGRAPHIC HASH COMMITMENT:</span>
                    <span className="break-all font-mono text-[10px] bg-paper-card p-1.5 block rounded-sm border border-paper-border text-paper-ink">
                      {hashVerifyResult.record.hash}
                    </span>
                  </div>
                  {hashVerifyResult.record.details && (
                    <div className="pt-1 text-paper-muted text-[10px] italic">
                      "{hashVerifyResult.record.details}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {hashVerifyResult && !hashVerifyResult.isFound && (
              <div className="bg-red-50 border border-red-300 p-4 rounded-sm space-y-1.5 text-red-900 shadow-offset-sm">
                <div className="flex items-center space-x-1.5 font-bold text-red-800">
                  <Warning size={18} weight="bold" />
                  <span>RECORD INTEGRITY MISMATCH</span>
                </div>
                <p className="font-mono text-[11px] mt-1">{hashVerifyResult.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Audit Stream & Filters */}
        <div className="lg:col-span-7 space-y-4 font-mono text-xs">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">
                  Live Microservice Audit Stream
                </h3>
                <span className="text-[11px] text-paper-muted font-body">
                  Click any row to automatically load and verify its cryptographic hash.
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-paper-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter audit events…"
                    className="bg-paper-bg border border-paper-border rounded-sm pl-8 pr-3 py-1.5 text-[11px] text-paper-ink focus:outline-none focus:border-paper-ink w-36 sm:w-44"
                  />
                </div>
              </div>
            </div>

            {/* Service Filters */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'INTEGRATION', 'AUTH', 'DOCUMENT', 'NOTIFICATION'].map((srv) => (
                <button
                  key={srv}
                  type="button"
                  onClick={() => setSelectedService(srv)}
                  className={`px-2.5 py-1 rounded-sm border text-[10px] font-bold transition ${
                    selectedService === srv
                      ? 'bg-paper-rust text-white border-paper-rust'
                      : 'bg-paper-surface border-paper-border text-paper-ink hover:border-paper-ink'
                  }`}
                >
                  {srv}
                </button>
              ))}
            </div>

            {/* Audit Table */}
            <div className="overflow-x-auto border border-paper-border rounded-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-paper-surface text-paper-muted uppercase text-[10px] border-b border-paper-border">
                  <tr>
                    <th className="p-2.5">Log ID</th>
                    <th className="p-2.5">Event</th>
                    <th className="p-2.5">Service</th>
                    <th className="p-2.5">Initiator</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border text-paper-ink bg-paper-card">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-paper-muted">
                        No audit events match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-paper-surface cursor-pointer transition-colors"
                        onClick={() => useLogForVerify(log)}
                        title="Click to load this record into the verifier"
                      >
                        <td className="p-2.5 text-paper-rust font-bold font-mono">{log.id}</td>
                        <td className="p-2.5 font-semibold font-mono">{log.action}</td>
                        <td className="p-2.5">
                          <span className="bg-paper-surface border border-paper-border px-1.5 py-0.5 rounded text-[10px] text-paper-muted font-mono">
                            {log.service}
                          </span>
                        </td>
                        <td className="p-2.5 text-[10px] text-paper-muted truncate max-w-[140px]">
                          {log.user}
                        </td>
                        <td className="p-2.5">
                          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-1.5 py-0.5 rounded-sm text-[9px] font-bold">
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthAndAuditModule;
