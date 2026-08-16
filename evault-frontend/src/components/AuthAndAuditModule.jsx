import React, { useState } from 'react';
import { User, ShieldCheck, Lock, CheckCircle, Warning, ArrowsClockwise, Fingerprint } from '@phosphor-icons/react';
import api from '../services/api';

// Sample ledger entries — full digests so the verifier can match them
const AUDIT_LOGS = [
  {
    id: 'AUD-88101',
    timestamp: '2026-08-15 21:55:10',
    action: 'DOCUMENT_CLASSIFIED',
    service: 'Integration',
    hash: '0x8f2d1a9e4c7b2e901f6a88d3c1b5e0472a9d6f81c3e7b4a0123456789abcdef0',
    status: 'VERIFIED',
    user: 'Adv. Ramesh Sharma (LAWYER)',
  },
  {
    id: 'AUD-88102',
    timestamp: '2026-08-15 21:52:40',
    action: 'AADHAAR_HASH_BOUND',
    service: 'Integration',
    hash: '0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 'VERIFIED',
    user: 'Priya Verma (CITIZEN)',
  },
  {
    id: 'AUD-88103',
    timestamp: '2026-08-15 21:48:15',
    action: 'ECOURTS_CASE_FETCH',
    service: 'Integration',
    hash: '0x3a19d4c18e2f7b6a9c0d1e2f3a4b5c6d7e8f90123456789abcdef0123456789',
    status: 'VERIFIED',
    user: 'Hon. Justice S. Mehta (JUDGE)',
  },
  {
    id: 'AUD-88104',
    timestamp: '2026-08-15 21:40:02',
    action: 'JWT_AUTH_LOGIN',
    service: 'Auth',
    hash: '0x7c9209ef1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5',
    status: 'VERIFIED',
    user: 'Adv. Ramesh Sharma (LAWYER)',
  },
];

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(digest));
  return '0x' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function AuthAndAuditModule({ currentUser, walletAddress, onLoginSuccess, onLogout }) {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('LAWYER');
  const [name, setName] = useState('');
  const [barNumber, setBarNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState(AUDIT_LOGS);

  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [hashVerifyResult, setHashVerifyResult] = useState(null);
  const [hashSource, setHashSource] = useState('');
  const [computedHash, setComputedHash] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.login({ email, password });
      if (response.success) {
        onLoginSuccess(response.data.user);
      } else {
        setError(response.error || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      setError('Please fill out all registration fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.register({
        name,
        email,
        password,
        role,
        barNumber,
        walletAddress: walletAddress || undefined,
      });
      if (response.success) {
        onLoginSuccess(response.data.user);
      } else {
        setError(response.error || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to register user.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHash = () => {
    if (!verifyHashInput.trim()) return;
    const q = verifyHashInput.trim().toLowerCase();
    const matchedLog = auditLogs.find(
      (l) =>
        l.hash.toLowerCase() === q ||
        l.hash.toLowerCase().includes(q) ||
        l.id.toLowerCase() === q
    );
    if (matchedLog) {
      setHashVerifyResult({ isFound: true, record: matchedLog });
    } else {
      setHashVerifyResult({
        isFound: false,
        error: 'No matching record found. Use an Audit Log ID from the stream below, click a row, or paste a full hash digest.',
      });
    }
  };

  const handleComputeHash = async () => {
    if (!hashSource.trim()) return;
    const digest = await sha256Hex(hashSource.trim());
    const newLog = {
      id: `AUD-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      action: 'DOCUMENT_HASHED',
      service: 'Audit',
      hash: digest,
      status: 'VERIFIED',
      user: currentUser?.name || currentUser?.email || 'Current user',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    setComputedHash(digest);
    setVerifyHashInput(digest);
    setHashVerifyResult({ isFound: true, record: newLog });
  };

  const useLogForVerify = (log) => {
    setVerifyHashInput(log.hash);
    setHashVerifyResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">05 / AUTHENTICATION & AUDIT TRAIL</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">Security & Audit</h2>
            <p className="text-xs text-paper-muted mt-1 font-body">
              Sign in with your account, or connect MetaMask from the header for wallet authentication.
            </p>
          </div>

          {currentUser ? (
            <div className="flex items-center space-x-3 bg-paper-surface border border-paper-ink px-4 py-2 rounded-sm font-mono text-xs">
              <div>
                <span className="text-paper-rust font-bold">{currentUser.name}</span>
                <span className="text-[10px] text-paper-muted block font-sans uppercase font-bold">{currentUser.role}</span>
              </div>
              <button
                onClick={onLogout}
                className="bg-paper-card border border-paper-ink text-paper-ink hover:bg-paper-rust hover:text-white px-2.5 py-1 text-[11px] font-bold transition rounded-sm"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="text-paper-muted text-[11px] font-bold">QUICK FILL:</span>
              <button
                type="button"
                onClick={() => {
                  setEmail('lawyer.sharma@evault.in');
                  setPassword('password123');
                  setRole('LAWYER');
                  setName('Adv. Ramesh Sharma');
                }}
                className="bg-paper-surface border border-paper-border hover:border-paper-ink text-paper-ink px-2.5 py-1 transition rounded-sm"
              >
                Lawyer
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('judge.mehta@courts.gov.in');
                  setPassword('password123');
                  setRole('JUDGE');
                  setName('Hon. Justice S. Mehta');
                }}
                className="bg-paper-surface border border-paper-border hover:border-paper-ink text-paper-ink px-2.5 py-1 transition rounded-sm"
              >
                Judge
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2">
              <User size={18} weight="bold" className="text-paper-rust" />
              <span>User Authentication</span>
            </h3>

            <div className="flex bg-paper-surface border border-paper-border p-1 font-mono text-xs rounded-sm">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`px-3 py-1 font-medium transition ${
                  authMode === 'login' ? 'bg-paper-card text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted'
                }`}
              >
                LOGIN
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`px-3 py-1 font-medium transition ${
                  authMode === 'register' ? 'bg-paper-card text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted'
                }`}
              >
                REGISTER
              </button>
            </div>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3.5 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">USER EMAIL / USERNAME</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">SECURITY PASSWORD</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <button type="submit" disabled={loading} className="btn-editorial-rust font-mono w-full">
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <Lock size={16} weight="bold" />}
                <span>{loading ? 'AUTHENTICATING...' : 'LOGIN'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5 font-mono text-xs">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">FULL LEGAL NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1">ACCOUNT ROLE</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                >
                  <option value="LAWYER">Advocate / Lawyer</option>
                  <option value="JUDGE">Judicial Officer / Judge</option>
                  <option value="CITIZEN">Citizen / Petitioner</option>
                  <option value="POLICE">Law Enforcement / Police</option>
                </select>
              </div>

              {role === 'LAWYER' && (
                <div>
                  <label className="block text-[10px] text-paper-muted uppercase mb-1">BAR COUNCIL REG NUMBER</label>
                  <input
                    type="text"
                    value={barNumber}
                    onChange={(e) => setBarNumber(e.target.value)}
                    placeholder="e.g. MAH-10492-2020"
                    className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                  />
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-editorial-rust font-mono w-full">
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
                <span>{loading ? 'REGISTERING...' : 'REGISTER ACCOUNT'}</span>
              </button>
            </form>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-sm flex items-center space-x-2 text-red-800 text-xs font-mono">
              <Warning size={16} weight="bold" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-4 font-mono text-xs">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <Fingerprint size={18} weight="bold" className="text-paper-rust" />
              <span>Audit Record Verifier</span>
            </h3>

            <p className="text-[11px] text-paper-muted font-body leading-relaxed">
              Verify an existing ledger entry (click a row below), or hash document text to record a new digest on the stream, then verify it.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={verifyHashInput}
                onChange={(e) => setVerifyHashInput(e.target.value)}
                placeholder="Audit Log ID or SHA-256 hash…"
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button type="button" onClick={handleVerifyHash} className="btn-editorial font-mono">
                VERIFY
              </button>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3 rounded-sm space-y-2">
              <label className="block text-[10px] text-paper-muted uppercase font-bold">
                Hash text &amp; record on audit stream
              </label>
              <textarea
                value={hashSource}
                onChange={(e) => setHashSource(e.target.value)}
                rows={2}
                placeholder="Paste document text to fingerprint…"
                className="w-full bg-paper-bg border border-paper-border rounded-sm p-2 text-[11px] text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button type="button" onClick={handleComputeHash} className="btn-editorial font-mono text-[11px]">
                HASH &amp; RECORD
              </button>
              {computedHash && (
                <p className="text-[10px] break-all text-paper-ink">
                  <span className="text-paper-muted">Recorded digest: </span>{computedHash}
                </p>
              )}
            </div>

            {hashVerifyResult?.isFound && (
              <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm space-y-1 text-paper-ink">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                  <CheckCircle size={16} weight="fill" />
                  <span>RECORD FOUND ON AUDIT LEDGER</span>
                </div>
                <p><span className="text-paper-muted">Audit ID:</span> {hashVerifyResult.record.id}</p>
                <p><span className="text-paper-muted">Service:</span> {hashVerifyResult.record.service}</p>
                <p className="break-all"><span className="text-paper-muted">Hash:</span> {hashVerifyResult.record.hash}</p>
                <p><span className="text-paper-muted">User:</span> {hashVerifyResult.record.user}</p>
              </div>
            )}

            {hashVerifyResult && !hashVerifyResult.isFound && (
              <div className="bg-red-50 border border-red-300 p-3.5 rounded-sm space-y-1 text-red-900">
                <div className="flex items-center space-x-1.5 font-bold text-red-800">
                  <Warning size={16} weight="bold" />
                  <span>VERIFICATION FAILED</span>
                </div>
                <p className="font-mono text-[11px] mt-1">{hashVerifyResult.error}</p>
              </div>
            )}
          </div>

          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <div className="flex items-center justify-between border-b border-paper-border pb-3">
              <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">Live Audit Stream</h3>
              <span className="text-[10px] bg-paper-surface border border-paper-border px-2 py-0.5 rounded-sm font-bold text-paper-rust">
                Click a row to verify
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-paper-surface text-paper-muted uppercase text-[10px] border-b border-paper-border">
                  <tr>
                    <th className="p-2">Log ID</th>
                    <th className="p-2">Event</th>
                    <th className="p-2">Service</th>
                    <th className="p-2">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border text-paper-ink">
                  {auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-paper-surface cursor-pointer"
                      onClick={() => useLogForVerify(log)}
                      title="Click to load this hash into the verifier"
                    >
                      <td className="p-2 text-paper-rust font-bold">{log.id}</td>
                      <td className="p-2 font-semibold">{log.action}</td>
                      <td className="p-2 text-paper-muted">{log.service}</td>
                      <td className="p-2">
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 rounded-sm text-[9px] font-bold">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
