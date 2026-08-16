import React, { useState, useEffect } from 'react';
import { Fingerprint, Lock, CheckCircle, Warning, ArrowsClockwise, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react';
import api from '../services/api';

export function AadhaarBinding({ walletAddress, isConnected, onBindingSuccess }) {
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [showRawAadhaar, setShowRawAadhaar] = useState(false);
  const [verifyWallet, setVerifyWallet] = useState(walletAddress || '');

  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [bindResult, setBindResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (walletAddress) setVerifyWallet(walletAddress);
  }, [walletAddress]);

  const handleBind = async (e) => {
    e.preventDefault();
    const cleanedAadhaar = aadhaarInput.replace(/\D/g, '');
    if (cleanedAadhaar.length !== 12) {
      setError('Aadhaar number must be exactly 12 numeric digits.');
      return;
    }
    if (!walletAddress) {
      setError('Please connect your Web3 wallet first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.bindAadhaar(cleanedAadhaar, walletAddress);
      if (response.success) {
        setBindResult(response.data);
        if (onBindingSuccess) onBindingSuccess(response.data);
        setAadhaarInput('');
      } else {
        setError(response.error || 'Binding failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create identity commitment.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyWallet.trim()) return;
    setVerifyLoading(true);
    try {
      const response = await api.verifyAadhaar(verifyWallet);
      if (response.success) setVerifyResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Verification failed.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <Fingerprint size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">
              Privacy-preserving identity
            </span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">
              Identity Commitment Binding
            </h2>
            <p className="text-xs text-paper-muted font-body mt-1 max-w-2xl">
              Creates a server-side HMAC commitment bound to your wallet. This is not UIDAI / Aadhaar KYC verification.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2">
              <Fingerprint size={16} weight="bold" className="text-paper-rust" />
              <span>Create identity commitment</span>
            </h3>
            <span className="text-[10px] font-mono bg-paper-surface text-paper-ink border border-paper-border px-2 py-0.5 rounded-sm font-bold">
              HMAC-SHA256
            </span>
          </div>

          <form onSubmit={handleBind} className="space-y-4">
            <div>
              <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">Target wallet</label>
              <input
                type="text"
                readOnly
                value={walletAddress || 'Wallet not connected'}
                className="w-full bg-paper-surface border border-paper-border p-2.5 text-xs font-mono text-paper-ink rounded-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                12-digit Aadhaar (used only to derive commitment)
              </label>
              <div className="relative">
                <input
                  type={showRawAadhaar ? 'text' : 'password'}
                  maxLength={12}
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••••••••"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink font-mono tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowRawAadhaar(!showRawAadhaar)}
                  className="absolute right-3 top-2.5 text-paper-muted hover:text-paper-ink"
                >
                  {showRawAadhaar ? <EyeSlash size={16} weight="bold" /> : <Eye size={16} weight="bold" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isConnected || aadhaarInput.length !== 12}
              className="btn-editorial-rust font-heading w-full"
            >
              {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
              <span>{loading ? 'CREATING COMMITMENT…' : 'BIND IDENTITY COMMITMENT'}</span>
            </button>
          </form>

          {bindResult && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-sm space-y-2 text-emerald-950 text-xs">
              <div className="flex items-center space-x-1.5 font-heading font-bold">
                <CheckCircle size={18} weight="fill" className="text-emerald-700" />
                <span>Identity commitment bound</span>
              </div>
              <p className="font-mono break-all text-[11px]">
                <span className="font-bold">Commitment:</span> {bindResult.commitment || bindResult.aadhaarHash}
              </p>
              <p className="font-body text-[11px] text-emerald-900">
                {bindResult.note || 'Not a government Aadhaar verification.'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-sm flex items-center space-x-2 text-red-800 text-xs">
              <Warning size={16} weight="bold" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <Lock size={16} weight="bold" className="text-paper-rust" />
              <span>Check binding status</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={verifyWallet}
                onChange={(e) => setVerifyWallet(e.target.value)}
                placeholder="0x…"
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink"
              />
              <button
                onClick={handleVerify}
                disabled={verifyLoading || !verifyWallet}
                className="btn-editorial font-heading"
              >
                {verifyLoading ? '…' : 'CHECK'}
              </button>
            </div>

            {verifyResult && (
              <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-paper-muted">Commitment state</span>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono ${
                    verifyResult.isBound
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-red-100 text-red-900 border border-red-300'
                  }`}>
                    {verifyResult.isBound ? 'BOUND' : 'UNBOUND'}
                  </span>
                </div>
                <p className="font-mono truncate text-paper-ink">{verifyResult.wallet}</p>
                {verifyResult.note && (
                  <p className="text-paper-muted font-body text-[11px]">{verifyResult.note}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2">
            <h4 className="font-heading text-xs font-bold text-paper-ink uppercase">What this is</h4>
            <ul className="text-xs text-paper-muted space-y-1 list-disc list-inside font-body">
              <li>Server-side HMAC commitment — not a plain unsalted Aadhaar hash.</li>
              <li>Plaintext Aadhaar is never stored.</li>
              <li>Does not claim “Aadhaar Verified” without UIDAI integration.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AadhaarBinding;
