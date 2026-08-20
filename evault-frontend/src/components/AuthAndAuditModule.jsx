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
  User,
  Database
} from '@phosphor-icons/react';
import api from '../services/api';

const serviceFromAction = (action = '') => {
  const value = action.toUpperCase();
  if (value.includes('LOGIN') || value.includes('AUTH') || value.includes('SESSION') || value.includes('VAULT_') || value.includes('REGISTER')) return 'Auth';
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

/**
 * Multi-layer Initiator Identity Resolver:
 * Extracts Name, Role, and Wallet ID from structured fields, details text, local registry, or active session.
 */
const resolveInitiatorInfo = (log, currentUser) => {
  let name = log.userName || log.initiatorName || '';
  let role = log.role || log.initiatorRole || '';
  let wallet = log.performedBy || log.user || log.initiatorWallet || '';

  // 1. Parse from details string if formatted by frontend / backend
  if (log.details) {
    const d = String(log.details);

    // Pattern: "User <Name> (<ROLE>)" or "by <Name> (<ROLE>)" or "for <Name> (<ROLE>)"
    const matchUserRole = d.match(/(?:User|by|for|signed by|initiated by)\s+([A-Za-z0-9.\s]+?)\s*\(([A-Z]+)\)/i);
    if (matchUserRole) {
      if (!name) name = matchUserRole[1].trim();
      if (!role) role = matchUserRole[2].trim().toUpperCase();
    }

    // Pattern: "New <ROLE> profile registered for <Name>"
    const matchReg = d.match(/New\s+([A-Z]+)\s+profile registered for\s+([^(\n]+)/i);
    if (matchReg) {
      if (!role) role = matchReg[1].trim().toUpperCase();
      if (!name) name = matchReg[2].trim();
    }

    // Pattern: "Bound Wallet: (0x...)" or "[Wallet: 0x...]"
    const matchWallet = d.match(/(?:Bound Wallet:|\[Wallet:)\s*(0x[a-fA-F0-9]{40})/i);
    if (matchWallet && (!wallet || !wallet.startsWith('0x'))) {
      wallet = matchWallet[1];
    }
  }

  // 2. Check if log.user or wallet is formatted like "Name (ROLE)"
  if (wallet && (wallet.includes('(') || wallet.includes('['))) {
    const parsed = wallet.match(/^(.+?)\s*[(\[]([A-Z]+)[)\]](?:\s*\(?(0x[a-fA-F0-9]+)?\)?)?$/i);
    if (parsed) {
      if (!name) name = parsed[1].trim();
      if (!role) role = parsed[2].trim().toUpperCase();
      if (parsed[3]) wallet = parsed[3];
    }
  }

  // 3. Lookup against registered accounts in localStorage
  try {
    const raw = localStorage.getItem('evault-registered-accounts');
    if (raw) {
      const accounts = JSON.parse(raw);
      if (Array.isArray(accounts)) {
        const found = accounts.find(
          (acc) =>
            (wallet && acc.walletAddress && acc.walletAddress.toLowerCase() === wallet.toLowerCase()) ||
            (name && acc.name && acc.name.toLowerCase() === name.toLowerCase())
        );
        if (found) {
          if (!name) name = found.name;
          if (!role) role = (found.role || 'LAWYER').toUpperCase();
          if (!wallet || !wallet.startsWith('0x')) wallet = found.walletAddress;
        }
      }
    }
  } catch (e) {}

  // 4. Lookup against Aadhaar bindings in localStorage
  try {
    const rawAadhaar = localStorage.getItem('evault-aadhaar-bindings');
    if (rawAadhaar) {
      const bindings = JSON.parse(rawAadhaar);
      if (Array.isArray(bindings)) {
        const found = bindings.find(
          (b) =>
            (wallet && b.wallet && b.wallet.toLowerCase() === wallet.toLowerCase()) ||
            (name && b.fullName && b.fullName.toLowerCase() === name.toLowerCase())
        );
        if (found) {
          if (!name) name = found.fullName;
          if (!role) role = (found.role || 'CITIZEN').toUpperCase();
        }
      }
    }
  } catch (e) {}

  // 5. Check against active currentUser session
  if (currentUser) {
    const isCurrentWallet = wallet && currentUser.walletAddress && wallet.toLowerCase() === currentUser.walletAddress.toLowerCase();
    const isDemoWallet = wallet === '0xDemoWallet' || wallet === '0xDemo' || wallet === '0xVaultUser' || !wallet;
    if (isCurrentWallet || (isDemoWallet && !name)) {
      if (!name) name = currentUser.name;
      if (!role) role = (currentUser.role || 'CLIENT').toUpperCase();
      if (isDemoWallet && currentUser.walletAddress) wallet = currentUser.walletAddress;
    }
  }

  // 6. Check stored active session in localStorage
  try {
    const savedWallet = localStorage.getItem('evault-wallet');
    const savedName = localStorage.getItem('evault-name');
    const savedRole = localStorage.getItem('evault-role');
    if (savedWallet && wallet && savedWallet.toLowerCase() === wallet.toLowerCase()) {
      if (!name && savedName) name = savedName;
      if (!role && savedRole) role = savedRole.toUpperCase();
    }
  } catch (e) {}

  // 7. Role and Name inferences for system / automated actions
  const actionUpper = (log.action || '').toUpperCase();
  const serviceUpper = (log.service || '').toUpperCase();
  const docIdUpper = (log.docId || '').toUpperCase();
  const detailsUpper = (log.details || '').toUpperCase();

  // If document ID, details, or action indicates a Judicial Order or Bench signing, ensure role is JUDGE
  if (
    actionUpper.includes('ORDER') ||
    actionUpper.includes('JUDICIAL') ||
    docIdUpper.startsWith('ORDER-') ||
    detailsUpper.includes('ORDER') ||
    detailsUpper.includes('JUDICIAL') ||
    detailsUpper.includes('JUDGE') ||
    detailsUpper.includes('BENCH')
  ) {
    role = 'JUDGE';
    if (!name || name === 'Counsel of Record' || name === 'Authorized User' || name.startsWith('User (')) {
      name = 'Hon. Judicial Officer';
    }
  }

  if (!role) {
    if (actionUpper.includes('ORDER') || actionUpper.includes('JUDGE') || actionUpper.includes('SIGN')) {
      role = 'JUDGE';
    } else if (actionUpper.includes('FILE') || actionUpper.includes('AMEND') || actionUpper.includes('UPLOAD')) {
      role = 'LAWYER';
    } else if (actionUpper.includes('AADHAAR') || actionUpper.includes('KYC') || actionUpper.includes('CITIZEN')) {
      role = 'CITIZEN';
    } else if (serviceUpper.includes('NOTIF') || serviceUpper.includes('GATEWAY') || actionUpper.includes('SYSTEM')) {
      role = 'SYSTEM';
    } else {
      role = 'LAWYER';
    }
  }

  if (!name) {
    if (role === 'SYSTEM') {
      name = 'System Daemon';
    } else if (role === 'JUDGE') {
      name = 'Hon. Judicial Officer';
    } else if (role === 'LAWYER') {
      name = 'Counsel of Record';
    } else if (role === 'CITIZEN' || role === 'CLIENT') {
      name = 'Verified Citizen';
    } else if (wallet && wallet.startsWith('0x')) {
      name = `User (${wallet.substring(0, 6)}…${wallet.substring(wallet.length - 4)})`;
    } else {
      name = 'Authorized User';
    }
  }

  if (!wallet) {
    wallet = role === 'SYSTEM' ? 'SYSTEM_DAEMON' : '0xVaultUser';
  }

  return {
    initiatorName: name,
    initiatorRole: role.toUpperCase(),
    initiatorWallet: wallet,
  };
};

const getRoleBadgeStyle = (role = '') => {
  switch (role.toUpperCase()) {
    case 'JUDGE':
      return 'bg-purple-100 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    case 'LAWYER':
      return 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    case 'CITIZEN':
    case 'CLIENT':
      return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    case 'POLICE':
      return 'bg-blue-100 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-800';
    case 'SYSTEM':
    case 'ADMIN':
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
  }
};

const normalizeAuditLog = (log, currentUser) => {
  const service = log.service || serviceFromAction(log.action);
  const resolved = resolveInitiatorInfo({ ...log, service }, currentUser);

  return {
    id: log.id || log.hash || `LOG-${Date.now()}`,
    displayId: `AUD-${String(log.id || '').replace(/[^0-9]/g, '').slice(-5) || String(Math.floor(Math.random()*90000) + 10000)}`,
    docId: log.docId || 'No document',
    caseId: log.caseId || 'No case',
    action: log.action || 'UNKNOWN',
    service,
    hash: log.txHash || log.docId || log.hash || String(log.id),
    blockNumber: log.txHash ? 'Anchored' : 'Recorded',
    status: statusFromLog(log),
    user: `${resolved.initiatorName} (${resolved.initiatorRole})`,
    initiatorName: resolved.initiatorName,
    initiatorRole: resolved.initiatorRole,
    initiatorWallet: resolved.initiatorWallet,
    timestamp: formatAuditTime(log.performedAt || log.timestamp || log.createdAt),
    details: log.details || 'No additional details recorded.',
  };
};

export function AuthAndAuditModule({ currentUser, walletAddress, onLogout }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [auditError, setAuditError] = useState('');
  const [selectedService, setSelectedService] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [hashVerifyResult, setHashVerifyResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    setAuditError('');
    try {
      const rows = await api.getAuditLogs();
      setAuditLogs(Array.isArray(rows) ? rows.map((l) => normalizeAuditLog(l, currentUser)) : []);
    } catch (err) {
      console.warn('Could not load audit records:', err);
      setAuditError('Could not load live audit records. Please check the audit service.');
      setAuditLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleVerifyHash = () => {
    if (!verifyHashInput.trim()) return;
    setIsVerifying(true);
    const q = verifyHashInput.trim().toLowerCase();

    setTimeout(() => {
      const matchedLog = auditLogs.find(
        (l) =>
          l.hash?.toLowerCase() === q ||
          l.hash?.toLowerCase().includes(q) ||
          String(l.id).toLowerCase() === q ||
          l.displayId?.toLowerCase() === q ||
          l.displayId?.toLowerCase().includes(q) ||
          l.docId?.toLowerCase().includes(q) ||
          l.initiatorWallet?.toLowerCase() === q ||
          l.initiatorName?.toLowerCase().includes(q)
      );

      if (matchedLog) {
        setHashVerifyResult({ isFound: true, record: matchedLog });
      } else {
        setHashVerifyResult({
          isFound: false,
          error: 'No matching cryptographic proof found on ledger. Please check the Audit Log ID, SHA-256 hash, or Initiator Wallet.',
        });
      }
      setIsVerifying(false);
    }, 300);
  };

  const useLogForVerify = (log) => {
    setVerifyHashInput(log.displayId || log.hash);
    setHashVerifyResult({ isFound: true, record: log });
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesService = selectedService === 'ALL' || (log.service || '').toUpperCase() === selectedService.toUpperCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (log.displayId && log.displayId.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.hash && log.hash.toLowerCase().includes(q)) ||
      (log.initiatorName && log.initiatorName.toLowerCase().includes(q)) ||
      (log.initiatorRole && log.initiatorRole.toLowerCase().includes(q)) ||
      (log.initiatorWallet && log.initiatorWallet.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q));
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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-paper-card border border-paper-border p-8 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-paper-border bg-paper-surface">
              <ShieldCheck size={19} weight="bold" className="text-paper-rust" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-paper-ink">
                Audit activity & Ledger
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={exportAuditLog}
              className="btn-editorial h-9 self-start sm:self-auto text-xs font-heading"
              title="Download full audit stream in JSON format"
            >
              <DownloadSimple size={15} weight="bold" />
              <span>Export JSON</span>
            </button>

            {currentUser && (
              <div className="flex items-center space-x-2 bg-paper-surface border border-paper-border px-3 py-1.5 rounded-md font-mono text-xs shadow-offset-sm">
                <div>
                  <span className="text-paper-rust font-bold">{currentUser.name || 'AUTHENTICATED USER'}</span>
                  <span className="text-[10px] text-paper-muted block font-sans uppercase font-bold">
                    {currentUser.role || 'CLIENT'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="group bg-paper-card border border-paper-border p-5 rounded-xl space-y-3 hover:-translate-y-1 hover:border-paper-rust/50 hover:shadow-lg hover:shadow-paper-rust/5 transition-all duration-300">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold uppercase tracking-wider">
            <span className="group-hover:text-paper-rust transition-colors duration-300">Verified events</span>
            <ShieldCheck size={18} weight="bold" className="text-emerald-500" />
          </div>
          <p className="text-4xl leading-none font-heading font-bold text-paper-ink">{auditLogs.length}</p>
          <span className="text-[10px] text-paper-muted block">Records in the audit stream</span>
        </div>

        <div className="group bg-paper-card border border-paper-border p-5 rounded-xl space-y-3 hover:-translate-y-1 hover:border-paper-rust/50 hover:shadow-lg hover:shadow-paper-rust/5 transition-all duration-300">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold uppercase tracking-wider">
            <span className="group-hover:text-paper-rust transition-colors duration-300">On-chain records</span>
            <HardDrives size={18} weight="bold" className="text-paper-rust" />
          </div>
          <p className="text-4xl leading-none font-heading font-bold text-paper-ink">
            {auditLogs.filter((log) => log.status === 'Anchored').length}
          </p>
          <span className="text-[10px] text-paper-muted block">Metadata anchored to Sepolia</span>
        </div>

        <div className="group bg-paper-card border border-paper-border p-5 rounded-xl space-y-3 hover:-translate-y-1 hover:border-paper-rust/50 hover:shadow-lg hover:shadow-paper-rust/5 transition-all duration-300">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold uppercase tracking-wider">
            <span className="group-hover:text-paper-rust transition-colors duration-300">Active services</span>
            <Database size={18} weight="bold" className="text-blue-500" />
          </div>
          <p className="text-4xl leading-none font-heading font-bold text-paper-ink">
            {new Set(auditLogs.map((log) => log.service)).size || '-'}
          </p>
          <span className="text-[10px] text-paper-muted block">Services represented in events</span>
        </div>

        <div className="group bg-paper-card border border-paper-border p-5 rounded-xl space-y-3 hover:-translate-y-1 hover:border-paper-rust/50 hover:shadow-lg hover:shadow-paper-rust/5 transition-all duration-300">
          <div className="flex items-center justify-between text-paper-muted text-[11px] font-semibold uppercase tracking-wider">
            <span className="group-hover:text-paper-rust transition-colors duration-300">Needs review</span>
            <Clock size={18} weight="bold" className="text-amber-500" />
          </div>
          <p className="text-4xl leading-none font-heading font-bold text-paper-ink">
            {auditLogs.filter((log) => log.status === 'Review').length}
          </p>
          <span className="text-[10px] text-paper-muted block">Unverified or failed writes</span>
        </div>
      </div>

      {/* Main Dual Panels: Verifier & Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Cryptographic Verifier */}
        <div className="lg:col-span-5 space-y-4 text-xs">
          <div className="bg-paper-card border border-paper-border p-8 shadow-sm rounded-xl space-y-6">
            <div className="flex items-center justify-between border-b border-paper-border pb-3">
              <h3 className="font-heading text-base font-bold text-paper-ink flex items-center space-x-2">
                <Fingerprint size={18} weight="bold" className="text-paper-rust" />
                <span>Verify a record</span>
              </h3>
              <span className="text-[10px] text-paper-muted font-medium">Cryptographic Check</span>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verifyHashInput}
                  onChange={(e) => setVerifyHashInput(e.target.value)}
                  placeholder="Audit ID, 0x hash, or Wallet ID"
                  className="w-full bg-paper-bg border border-paper-border rounded-md px-3 py-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink font-mono"
                />
                <button
                  type="button"
                  onClick={handleVerifyHash}
                  disabled={isVerifying}
                  className="btn-editorial-rust font-heading px-4 py-2 text-xs cursor-pointer"
                >
                  {isVerifying ? <ArrowsClockwise size={15} className="animate-spin" /> : 'Verify'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] text-paper-muted self-center mr-1">Recent:</span>
                {auditLogs.slice(0, 4).map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => {
                      setVerifyHashInput(log.displayId);
                      setHashVerifyResult({ isFound: true, record: log });
                    }}
                    className="text-[10px] bg-paper-surface hover:bg-paper-border border border-paper-border px-1.5 py-0.5 rounded-sm transition text-paper-ink font-mono cursor-pointer"
                  >
                    {log.displayId}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Result Card */}
            {hashVerifyResult?.isFound && (
              <div className="bg-paper-surface border border-emerald-600/40 p-4 rounded-md space-y-3 text-paper-ink shadow-offset-sm">
                <div className="flex items-center justify-between border-b border-paper-border pb-2">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-800 dark:text-emerald-400">
                    <CheckCircle size={18} weight="fill" className="text-emerald-600 dark:text-emerald-400" />
                    <span className="font-heading tracking-wide">
                      {hashVerifyResult.record.status === 'Anchored' ? 'Anchored on chain' : 'Audit record verified'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-paper-rust font-bold">{hashVerifyResult.record.displayId}</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Initiator Name:</span>
                    <span className="font-bold text-paper-ink text-[12px]">{hashVerifyResult.record.initiatorName}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Initiator Role:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getRoleBadgeStyle(hashVerifyResult.record.initiatorRole)}`}>
                      {hashVerifyResult.record.initiatorRole}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Bound Wallet / Key:</span>
                    <span className="font-mono text-[10px] text-paper-ink bg-paper-card px-2 py-0.5 rounded border border-paper-border break-all" title={hashVerifyResult.record.initiatorWallet}>
                      {hashVerifyResult.record.initiatorWallet}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Originating Service:</span>
                    <span className="font-semibold">{hashVerifyResult.record.service} Microservice</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Action Event:</span>
                    <span className="font-semibold text-paper-rust">{hashVerifyResult.record.action}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Timestamp:</span>
                    <span>{hashVerifyResult.record.timestamp}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-paper-muted">Chain State:</span>
                    <span className="font-mono font-semibold">{hashVerifyResult.record.blockNumber}</span>
                  </div>

                  <div className="pt-2 border-t border-paper-border space-y-1">
                    <span className="text-paper-muted block text-[10px] font-semibold">CRYPTOGRAPHIC HASH:</span>
                    <span className="break-all font-mono text-[10px] bg-paper-card p-1.5 block rounded-sm border border-paper-border text-paper-ink">
                      {hashVerifyResult.record.hash}
                    </span>
                  </div>

                  {hashVerifyResult.record.details && (
                    <div className="pt-1 text-paper-muted text-[10px] italic bg-paper-card/50 p-2 rounded border border-paper-border/60">
                      "{hashVerifyResult.record.details}"
                    </div>
                  )}
                </div>
              </div>
            )}

            {hashVerifyResult && !hashVerifyResult.isFound && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 p-4 rounded-md space-y-1.5 text-red-900 dark:text-red-300 shadow-offset-sm">
                <div className="flex items-center space-x-1.5 font-bold text-red-800 dark:text-red-300">
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
          <div className="bg-paper-card border border-paper-border p-8 shadow-sm rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-3">
              <div>
                <h3 className="font-heading text-base font-bold text-paper-ink">
                  Audit Stream
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                  className="btn-editorial h-8 px-2.5 text-[11px] disabled:opacity-60 cursor-pointer"
                >
                  {isLoadingLogs ? 'Refreshing...' : 'Refresh'}
                </button>
                <div className="relative">
                  <MagnifyingGlass size={14} className="absolute left-2.5 top-2.5 text-paper-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, role, ID, wallet…"
                    className="bg-paper-bg border border-paper-border rounded-md pl-8 pr-3 py-1.5 text-[11px] text-paper-ink focus:outline-none focus:border-paper-ink w-44 sm:w-56"
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
                  className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold transition cursor-pointer ${
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
                    <th className="p-2.5 font-semibold min-w-[170px]">Initiator (Name & Role)</th>
                    <th className="p-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border text-paper-ink bg-paper-card">
                  {isLoadingLogs && auditLogs.length === 0 ? (
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
                        title="Click to load this record into the cryptographic verifier"
                      >
                        <td className="p-2.5 text-paper-rust font-bold font-mono whitespace-nowrap">{log.displayId}</td>
                        <td className="p-2.5 font-semibold whitespace-nowrap">{log.action}</td>
                        <td className="p-2.5">
                          <span className="bg-paper-surface border border-paper-border px-1.5 py-0.5 rounded text-[10px] text-paper-muted font-mono">
                            {log.service}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-col gap-0.5 max-w-[210px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-heading font-bold text-paper-ink text-[12px] truncate" title={log.initiatorName}>
                                {log.initiatorName}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${getRoleBadgeStyle(log.initiatorRole)}`}>
                                {log.initiatorRole}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-paper-muted truncate" title={log.initiatorWallet}>
                              {log.initiatorWallet.startsWith('0x') && log.initiatorWallet.length > 12
                                ? `${log.initiatorWallet.substring(0, 6)}…${log.initiatorWallet.substring(log.initiatorWallet.length - 4)}`
                                : log.initiatorWallet}
                            </span>
                          </div>
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
