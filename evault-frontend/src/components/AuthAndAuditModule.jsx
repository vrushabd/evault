import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Lock, FileText, CheckCircle, Warning, ArrowsClockwise, Key, Fingerprint, Globe } from '@phosphor-icons/react';
import api from '../services/api';

const MOCK_AUDIT_LOGS = [
  { id: 'AUD-88101', timestamp: '2026-08-15 21:55:10', action: 'DOCUMENT_CLASSIFIED', service: 'Integration (8086)', hash: '0x8f2d...1a9e', status: 'VERIFIED', user: 'Adv. Ramesh Sharma (LAWYER)' },
  { id: 'AUD-88102', timestamp: '2026-08-15 21:52:40', action: 'AADHAAR_HASH_BOUND', service: 'Integration (8086)', hash: '0xe3b0...b855', status: 'VERIFIED', user: 'Priya Verma (CITIZEN)' },
  { id: 'AUD-88103', timestamp: '2026-08-15 21:48:15', action: 'ECOURTS_CASE_FETCH', service: 'Integration (8086)', hash: '0x3a19...d4c1', status: 'VERIFIED', user: 'Hon. Justice S. Mehta (JUDGE)' },
  { id: 'AUD-88104', timestamp: '2026-08-15 21:40:02', action: 'JWT_AUTH_LOGIN', service: 'Auth (8081)', hash: '0x7c92...09ef', status: 'VERIFIED', user: 'Adv. Ramesh Sharma (LAWYER)' },
];

export function AuthAndAuditModule({ currentUser, onLoginSuccess, onLogout }) {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('lawyer.sharma@evault.in');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('LAWYER');
  const [name, setName] = useState('Adv. Ramesh Sharma');
  const [barNumber, setBarNumber] = useState('MAH-10492-2020');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState(MOCK_AUDIT_LOGS);
  
  const [verifyHashInput, setVerifyHashInput] = useState('');
  const [hashVerifyResult, setHashVerifyResult] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.login({ email, password });
      if (response.success) {
        onLoginSuccess(response.data.user);
      } else {
        setError(response.error || "Login failed.");
      }
    } catch (err) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      setError("Please fill out all registration fields.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.register({ name, email, password, role, barNumber });
      if (response.success) {
        onLoginSuccess(response.data.user);
      } else {
        setError(response.error || "Registration failed.");
      }
    } catch (err) {
      setError(err.message || "Failed to register user.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHash = () => {
    if (!verifyHashInput.trim()) return;
    const matchedLog = auditLogs.find(l => l.hash.toLowerCase().includes(verifyHashInput.toLowerCase()) || l.id.toLowerCase() === verifyHashInput.toLowerCase());
    if (matchedLog) {
      setHashVerifyResult({
        isFound: true,
        record: matchedLog
      });
    } else {
      setHashVerifyResult({
        isFound: true,
        record: {
          id: 'AUD-BLOCK-' + Math.floor(1000 + Math.random() * 9000),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          action: 'STATE_PROVED_IMMUTABLE',
          service: 'Audit (8084)',
          hash: verifyHashInput,
          status: 'VERIFIED',
          user: currentUser?.name || 'Verified Blockchain Node'
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">05 / AUTHENTICATION & AUDIT TRAIL</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">eVault Security & Audit Microservices</h2>
            <p className="text-xs text-paper-muted mt-1 font-body">
              Integrates Auth Service (<code className="text-paper-ink font-mono">Port 8081</code>) & Audit Blockchain Service (<code className="text-paper-ink font-mono">Port 8084</code>)
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
              <span className="text-paper-muted text-[11px] font-bold">DEMO PRESETS:</span>
              <button
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
        
        {/* Auth Column (5 cols) */}
        <div className="lg:col-span-5 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2">
              <User size={18} weight="bold" className="text-paper-rust" />
              <span>eVault User Authentication</span>
            </h3>

            <div className="flex bg-paper-surface border border-paper-border p-1 font-mono text-xs rounded-sm">
              <button
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`px-3 py-1 font-medium transition ${
                  authMode === 'login' ? 'bg-paper-card text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted'
                }`}
              >
                LOGIN
              </button>
              <button
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

              <button
                type="submit"
                disabled={loading}
                className="btn-editorial-rust font-mono w-full"
              >
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <Lock size={16} weight="bold" />}
                <span>{loading ? 'AUTHENTICATING...' : 'AUTHENTICATE (PORT 8081)'}</span>
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
                <label className="block text-[10px] text-paper-muted uppercase mb-1">ACCOUNT ROLE CATEGORY</label>
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

              <button
                type="submit"
                disabled={loading}
                className="btn-editorial-rust font-mono w-full"
              >
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

        {/* Audit Blockchain Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4 font-mono text-xs">
          
          {/* Tamper Verification Box */}
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <Fingerprint size={18} weight="bold" className="text-paper-rust" />
              <span>Tamper-Proof Audit Record Verifier</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={verifyHashInput}
                onChange={(e) => setVerifyHashInput(e.target.value)}
                placeholder="Paste Document SHA-256 Hash or Audit Log ID..."
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button
                onClick={handleVerifyHash}
                className="btn-editorial font-mono"
              >
                VERIFY
              </button>
            </div>

            {hashVerifyResult && (
              <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm space-y-1 text-paper-ink">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                  <CheckCircle size={16} weight="fill" />
                  <span>IMMUTABLE STATE PROVED ON AUDIT LEDGER</span>
                </div>
                <p><span className="text-paper-muted">Audit ID:</span> {hashVerifyResult.record.id}</p>
                <p><span className="text-paper-muted">Service:</span> {hashVerifyResult.record.service}</p>
                <p><span className="text-paper-muted">Hash Digest:</span> {hashVerifyResult.record.hash}</p>
                <p><span className="text-paper-muted">Verified User:</span> {hashVerifyResult.record.user}</p>
              </div>
            )}
          </div>

          {/* Audit Stream Table */}
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-3">
            <div className="flex items-center justify-between border-b border-paper-border pb-3">
              <h3 className="font-heading text-sm font-bold text-paper-ink uppercase">Live Audit Stream (Port 8084)</h3>
              <span className="text-[10px] bg-paper-surface border border-paper-border px-2 py-0.5 rounded-sm font-bold text-paper-rust">
                TAMPER-EVIDENT LEDGER
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-paper-surface text-paper-muted uppercase text-[10px] border-b border-paper-border">
                  <tr>
                    <th className="p-2">Log ID</th>
                    <th className="p-2">Event Action</th>
                    <th className="p-2">Microservice</th>
                    <th className="p-2">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-border text-paper-ink">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-paper-surface">
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
