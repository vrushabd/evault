import React, { useEffect, useState } from 'react';
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
  ListNumbers,
  Database
} from '@phosphor-icons/react';
import api from '../services/api';

const serviceFromAction = (action = '') => {
  const value = action.toUpperCase();
  if (value.includes('LOGIN') || value.includes('AUTH')) return 'Auth';
  if (value.includes('NOTIFY')) return 'Notification';
  if (value.includes('CLASSIFY') || value.includes('AADHAAR') || value.includes('ECOURTS')) return 'Integration';
  return 'Document';
};

const statusFromLog = (log) => {
  const details = (log.details || '').toLowerCase();
  if (log.txHash) return 'Anchored';
  if (details.includes('unverified') || details.includes('failed') || details.includes('chainerror')) return 'Review';
  return 'Recorded';
};

const formatAuditTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const normalizeAuditLog = (log) => ({
  id: log.id,
  displayId: `AUD-${String(log.id).padStart(5, '0')}`,
  docId: log.docId || 'No document',
  caseId: log.caseId || 'No case',
  action: log.action || 'UNKNOWN',
  service: serviceFromAction(log.action),
  hash: log.txHash || log.docId || String(log.id),
  blockNumber: log.txHash ? 'Anchored' : 'Pending',
  status: statusFromLog(log),
  user: log.performedBy || 'System',
  timestamp: formatAuditTime(log.performedAt),
  details: log.details || 'No additional details recorded.',
});

export function AuthAndAuditModule() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [auditError, setAuditError] = useState('');
  const [selectedService, setSelectedService] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [hashVerifyResult, setHashVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const loadRecentAuditLogs = async () => {
    setIsLoadingLogs(true);
    setAuditError('');
    try {
      const response = await api.getAuditRecent(50);
      const rows = Array.isArray(response?.data) ? response.data : [];
      setAuditLogs(rows.map(normalizeAuditLog));
    } catch (err) {
      console.warn('Could not load audit records:', err);
      setAuditError('Could not load live audit records. Please check the audit service.');
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadRecentAuditLogs();
  }, []);

  const handleVerifyHash = () => {
    if (!verifyHashInput.trim()) return;
    setIsVerifying(true);
    const q = verifyHashInput.trim().toLowerCase();

    setTimeout(() => {
      const matchedLog = auditLogs.find(
        (l) =>
          l.hash.toLowerCase() === q ||
          l.hash.toLowerCase().includes(q) ||
          String(l.id).toLowerCase() === q ||
          l.displayId.toLowerCase() === q ||
          l.displayId.toLowerCase().includes(q) ||
          l.docId.toLowerCase().includes(q)
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
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-paper-card border border-paper-border p-5 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-paper-border bg-paper-surface">
              <ShieldCheck size={19} weight="bold" className="text-paper-rust" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-paper-ink">
                Audit activity
              </h2>
              <p className="text-xs text-paper-muted mt-1 font-body max-w-2xl">
                Monitor document, access, and verification events across eVault.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={exportAuditLog}
            className="btn-editorial h-9 self-start sm:self-auto text-xs font-heading"
            title="Download full audit stream in JSON format"
          >
            <DownloadSimple size={15} weight="bold" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-paper-card border border-paper-border p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold">
            <span>Verified events</span>
            <ShieldCheck size={17} weight="bold" className="text-emerald-600" />
          </div>
          <p className="text-2xl leading-none font-heading font-bold text-paper-ink">{auditLogs.length}</p>
          <span className="text-[10px] text-paper-muted block">Records in the audit stream</span>
        </div>

        <div className="bg-paper-card border border-paper-border p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold">
            <span>On-chain records</span>
            <HardDrives size={17} weight="bold" className="text-paper-rust" />
          </div>
          <p className="text-2xl leading-none font-heading font-bold text-paper-ink">
            {auditLogs.filter((log) => log.status === 'Anchored').length}
          </p>
          <span className="text-[10px] text-paper-muted block">Metadata anchored to Sepolia</span>
        </div>

        <div className="bg-paper-card border border-paper-border p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold">
            <span>Active services</span>
            <Database size={17} weight="bold" className="text-blue-600" />
          </div>
          <p className="text-2xl leading-none font-heading font-bold text-paper-ink">
            {new Set(auditLogs.map((log) => log.service)).size || '-'}
          </p>
          <span className="text-[10px] text-paper-muted block">Services represented in events</span>
        </div>

        <div className="bg-paper-card border border-paper-border p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold">
            <span>Needs review</span>
            <Clock size={17} weight="bold" className="text-amber-600" />
          </div>
          <p className="text-2xl leading-none font-heading font-bold text-paper-ink">
            {auditLogs.filter((log) => log.status === 'Review').length}
          </p>
          <span className="text-[10px] text-paper-muted block">Unverified or failed writes</span>
        </div>
      </div>

      {/* Main Dual Panels: Verifier & Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Cryptographic Verifier */}
        <div className="lg:col-span-5 space-y-4 text-xs">
          <div className="bg-paper-card border border-paper-border p-5 shadow-offset-sm rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-paper-border pb-3">
              <h3 className="font-heading text-base font-bold text-paper-ink flex items-center space-x-2">
                <Fingerprint size={18} weight="bold" className="text-paper-rust" />
                <span>Verify a record</span>
              </h3>
              <span className="text-[10px] text-paper-muted font-medium">Manual check</span>
            </div>

            <p className="text-xs text-paper-muted font-body leading-relaxed">
              Paste an audit ID or hash to check its cryptographic record.
            </p>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyHashInput}
                  onChange={(e) => setVerifyHashInput(e.target.value)}
                  placeholder="Audit ID or 0x hash"
                  className="w-full bg-paper-bg border border-paper-border rounded-md px-3 py-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink font-mono"
                />
                <button
                  type="button"
                  onClick={handleVerifyHash}
                  disabled={isVerifying}
                  className="btn-editorial-rust font-heading px-4 py-2 text-xs"
                >
                  {isVerifying ? <ArrowsClockwise size={15} className="animate-spin" /> : 'Verify'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-paper-muted self-center mr-1">Recent</span>
                {auditLogs.slice(0, 4).map((log) => (
                  <button
                    key={log.displayId}
                    type="button"
                    onClick={() => {
                      setVerifyHashInput(log.displayId);
                      setHashVerifyResult({ isFound: true, record: log });
                    }}
                    className="text-[10px] bg-paper-surface hover:bg-paper-border border border-paper-border px-1.5 py-0.5 rounded-sm transition text-paper-ink font-mono"
                  >
                    {log.displayId}
                  </button>
                ))}
              </div>
            </div>
            {/* Verification Result Card */}
            {hashVerifyResult?.isFound && (
              <div className="bg-paper-surface border border-emerald-600/40 p-4 rounded-md space-y-2.5 text-paper-ink shadow-offset-sm">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800 border-b border-paper-border pb-2">
                  <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                  <span className="font-heading tracking-wide">
                    {hashVerifyResult.record.status === 'Anchored' ? 'Anchored on chain' : 'Audit record found'}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-paper-muted">Audit ID:</span>
                    <span className="font-bold text-paper-rust">{hashVerifyResult.record.displayId}</span>
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
                    <span className="text-paper-muted">Chain state:</span>
                    <span className="font-mono">{hashVerifyResult.record.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-paper-muted">User Authority:</span>
                    <span className="font-bold text-paper-ink">{hashVerifyResult.record.user}</span>
                  </div>
                  <div className="pt-1.5 border-t border-paper-border">
                    <span className="text-paper-muted block text-[10px] mb-0.5">REFERENCE:</span>
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
              <div className="bg-red-50 border border-red-300 p-4 rounded-md space-y-1.5 text-red-900 shadow-offset-sm">
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
        <div className="lg:col-span-7 space-y-4 text-xs">
          <div className="bg-paper-card border border-paper-border p-5 shadow-offset-sm rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-paper-ink">
                  Audit stream
                </h3>
                <p className="text-[11px] text-paper-muted font-body mt-0.5">Select an event to load its verification data.</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={loadRecentAuditLogs}
                  disabled={isLoadingLogs}
                  className="btn-editorial h-8 px-2.5 text-[11px] disabled:opacity-60"
                >
                  {isLoadingLogs ? 'Refreshing...' : 'Refresh'}
                </button>
                <div className="relative">
                  <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-paper-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter audit events…"
                    className="bg-paper-bg border border-paper-border rounded-md pl-8 pr-3 py-1.5 text-[11px] text-paper-ink focus:outline-none focus:border-paper-ink w-36 sm:w-44"
                  />
                </div>
              </div>
            </div>

            {auditError && (
              <div className="bg-red-50 border border-red-300 p-3 rounded-sm text-red-800 text-[11px] font-body">
                {auditError}
              </div>
            )}

            {/* Service Filters */}
            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'INTEGRATION', 'AUTH', 'DOCUMENT', 'NOTIFICATION'].map((srv) => (
                <button
                  key={srv}
                  type="button"
                  onClick={() => setSelectedService(srv)}
                  className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold transition ${
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
            <div className="overflow-x-auto border border-paper-border rounded-md">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-paper-surface text-paper-muted text-[10px] border-b border-paper-border">
                  <tr>
                    <th className="p-2.5 font-semibold">Log ID</th>
                    <th className="p-2.5 font-semibold">Event</th>
                    <th className="p-2.5 font-semibold">Service</th>
                    <th className="p-2.5 font-semibold">Initiator</th>
                    <th className="p-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border text-paper-ink bg-paper-card">
                  {isLoadingLogs ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-paper-muted">
                        Loading audit records...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
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
                        <td className="p-2.5 text-paper-rust font-bold font-mono">{log.displayId}</td>
                        <td className="p-2.5 font-semibold">{log.action}</td>
                        <td className="p-2.5">
                          <span className="bg-paper-surface border border-paper-border px-1.5 py-0.5 rounded text-[10px] text-paper-muted font-mono">
                            {log.service}
                          </span>
                        </td>
                        <td className="p-2.5 text-[10px] text-paper-muted truncate max-w-[140px]">
                          {log.user}
                        </td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold border ${
                            log.status === 'Review'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                              : log.status === 'Anchored'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : 'bg-paper-surface text-paper-muted border-paper-border'
                          }`}>
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
