import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Lock,
  CheckCircle,
  Warning,
  ArrowsClockwise,
  Eye,
  EyeSlash,
  ShieldCheck,
  DeviceMobile,
  Timer,
  Key,
  Sparkle,
  Lightning,
  Trash,
} from '@phosphor-icons/react';
import api from '../services/api';

// ── VERHOEFF ALGORITHM TABLES (UIDAI Standard) ──────────────────────────
const D_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P_TABLE = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function validateVerhoeff(str) {
  if (!/^\d+$/.test(str)) return false;
  let c = 0;
  const digits = str.split('').map(Number).reverse();
  for (let i = 0; i < digits.length; i++) {
    c = D_TABLE[c][P_TABLE[i % 8][digits[i]]];
  }
  return c === 0;
}

function checkAadhaarStatus(cleaned) {
  if (!cleaned) return { state: 'empty' };
  if (cleaned.length < 12) return { state: 'typing', remaining: 12 - cleaned.length };
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return { state: 'invalid', message: 'Aadhaar numbers cannot start with 0 or 1' };
  }
  if (new Set(cleaned.split('')).size === 1) {
    return { state: 'invalid', message: 'Repeated duplicate sequences are not allowed' };
  }
  if (!validateVerhoeff(cleaned)) {
    return { state: 'invalid', message: 'Verhoeff checksum failed (invalid Aadhaar number)' };
  }
  return { state: 'valid', message: 'Mathematically valid Aadhaar (Verhoeff checksum passed)' };
}

const SAMPLE_VALID_AADHAARS = [
  '2345 6789 0124',
  '5839 2018 4751',
  '9182 7364 5018',
];

export function AadhaarBinding({ walletAddress, isConnected, onBindingSuccess }) {
  const [mode, setMode] = useState('direct'); // 'direct' = Tier 1 (1-Click Built-in e-KYC), 'otp' = Tier 2 (2-Step OTP)
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [showRawAadhaar, setShowRawAadhaar] = useState(false);
  const [verifyWallet, setVerifyWallet] = useState(walletAddress || '');

  // OTP state for Tier 2
  const [otpStep, setOtpStep] = useState(1);
  const [otpInput, setOtpInput] = useState('');
  const [txnId, setTxnId] = useState(null);
  const [maskedMobile, setMaskedMobile] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [bindResult, setBindResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (walletAddress) {
      setVerifyWallet(walletAddress);
      checkInitialStatus(walletAddress);
    }
  }, [walletAddress]);

  const checkInitialStatus = async (addr) => {
    try {
      const res = await api.verifyAadhaar(addr);
      if (res.success && res.data) {
        setVerifyResult(res.data);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (mode !== 'otp' || otpStep !== 2 || timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [mode, otpStep, timeLeft]);

  const cleanedAadhaar = aadhaarInput.replace(/\D/g, '');
  const aadhaarValidation = checkAadhaarStatus(cleanedAadhaar);

  const handleAadhaarChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    const parts = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    setAadhaarInput(parts.join(' '));
  };

  // TIER 1: Direct 1-Click Built-in e-KYC Binding
  const handleDirectBind = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please connect your Web3 wallet first.');
      return;
    }

    if (aadhaarValidation.state !== 'valid') {
      setError(aadhaarValidation.message || 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.bindAadhaar(cleanedAadhaar, walletAddress);
      if (res.success) {
        setBindResult(res.data);
        setVerifyResult({ wallet: walletAddress, isBound: true, boundAt: res.data.boundAt });
        if (onBindingSuccess) onBindingSuccess(res.data);
        setAadhaarInput('');
      } else {
        setError(res.error || 'Identity binding failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create identity commitment.');
    } finally {
      setLoading(false);
    }
  };

  // TIER 2: Step 1 Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!walletAddress) {
      setError('Please connect your Web3 wallet first.');
      return;
    }

    if (aadhaarValidation.state !== 'valid') {
      setError(aadhaarValidation.message || 'Please enter a valid 12-digit Aadhaar number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.sendAadhaarOtp(cleanedAadhaar, walletAddress);
      if (res.success) {
        setTxnId(res.data.txnId);
        setMaskedMobile(res.data.maskedMobile);
        setDemoOtp(res.data.demoOtp || '');
        setTimeLeft(res.data.expiresInSeconds || 300);
        setOtpStep(2);
      } else {
        setError(res.error || 'Failed to generate e-KYC OTP.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to initiate Aadhaar e-KYC.');
    } finally {
      setLoading(false);
    }
  };

  // TIER 2: Step 2 Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter the 6-digit verification OTP.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyAadhaarOtp(txnId, otpInput.trim(), walletAddress);
      if (res.success) {
        setBindResult(res.data);
        setVerifyResult({ wallet: walletAddress, isBound: true, boundAt: res.data.boundAt });
        if (onBindingSuccess) onBindingSuccess(res.data);
        setOtpStep(1);
        setAadhaarInput('');
        setOtpInput('');
      } else {
        setError(res.error || 'OTP verification failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // UNBIND / RESET IDENTITY
  const handleUnbind = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.unbindAadhaar(walletAddress);
      if (res.success) {
        setBindResult(null);
        setVerifyResult({ wallet: walletAddress, isBound: false, boundAt: null });
        if (onBindingSuccess) onBindingSuccess({ isBound: false, wallet: walletAddress });
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to unbind identity.');
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

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <Fingerprint size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">
                Privacy-Preserving Identity Binding
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.2 rounded-sm font-bold uppercase">
                Verhoeff Mathematical Checksum Validated
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">
              Built-In Aadhaar e-KYC Identity Commitment
            </h2>
            <p className="text-xs text-paper-muted font-body mt-1 max-w-2xl">
              Authenticates citizen identity using UIDAI's mathematical Verhoeff checksum algorithm.
              Raw Aadhaar numbers are never stored; only an irreversible HMAC-SHA256 commitment is anchored to your Web3 wallet address.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Left Column: e-KYC Form */}
        <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-5 rounded-sm">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2">
              <Fingerprint size={16} weight="bold" className="text-paper-rust" />
              <span>Identity Binding</span>
            </h3>
            {/* Mode Switcher */}
            <div className="flex items-center space-x-1 text-[10px] font-mono bg-paper-surface p-0.5 rounded-sm border border-paper-border">
              <button
                type="button"
                onClick={() => { setMode('direct'); setError(null); }}
                className={`px-2 py-0.5 rounded-sm font-bold transition-all cursor-pointer ${
                  mode === 'direct' ? 'bg-paper-rust text-white shadow-sm' : 'text-paper-muted hover:text-paper-ink'
                }`}
              >
                1-Click e-KYC
              </button>
              <button
                type="button"
                onClick={() => { setMode('otp'); setOtpStep(1); setError(null); }}
                className={`px-2 py-0.5 rounded-sm font-bold transition-all cursor-pointer ${
                  mode === 'otp' ? 'bg-paper-rust text-white shadow-sm' : 'text-paper-muted hover:text-paper-ink'
                }`}
              >
                2-Step OTP
              </button>
            </div>
          </div>

          {/* TIER 1: Direct 1-Click Verhoeff e-KYC */}
          {mode === 'direct' && (
            <form onSubmit={handleDirectBind} className="space-y-4">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                  Bound Web3 Wallet
                </label>
                <input
                  type="text"
                  readOnly
                  value={walletAddress || 'Wallet not connected'}
                  className="w-full bg-paper-surface border border-paper-border p-2.5 text-xs font-mono text-paper-ink rounded-sm cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] text-paper-muted uppercase tracking-wide">
                    12-digit Aadhaar Number
                  </label>
                  <span className="text-[10px] text-paper-muted font-mono">
                    {cleanedAadhaar.length}/12 digits
                  </span>
                </div>

                <div className="relative">
                  <input
                    type={showRawAadhaar ? 'text' : 'password'}
                    value={aadhaarInput}
                    onChange={handleAadhaarChange}
                    placeholder="•••• •••• ••••"
                    className={`w-full bg-paper-bg border rounded-sm px-3 py-2.5 text-xs text-paper-ink focus:outline-none font-mono tracking-widest transition-colors ${
                      aadhaarValidation.state === 'valid'
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : aadhaarValidation.state === 'invalid'
                        ? 'border-red-500 bg-red-500/5'
                        : 'border-paper-border focus:border-paper-ink'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRawAadhaar(!showRawAadhaar)}
                    className="absolute right-3 top-3 text-paper-muted hover:text-paper-ink"
                  >
                    {showRawAadhaar ? <EyeSlash size={16} weight="bold" /> : <Eye size={16} weight="bold" />}
                  </button>
                </div>

                {/* Real-time Mathematical Validation Feedback */}
                {aadhaarValidation.state === 'valid' && (
                  <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle size={14} weight="fill" />
                    <span>Valid Aadhaar format (Verhoeff checksum passed)</span>
                  </div>
                )}
                {aadhaarValidation.state === 'invalid' && (
                  <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-red-600 font-medium">
                    <Warning size={14} weight="bold" />
                    <span>{aadhaarValidation.message}</span>
                  </div>
                )}
              </div>

              {/* Sample Valid Aadhaar chips */}
              <div className="p-2.5 bg-paper-surface border border-paper-border/70 rounded-sm space-y-1.5">
                <div className="flex items-center space-x-1 text-[10px] text-paper-muted font-heading uppercase">
                  <Sparkle size={12} weight="bold" className="text-paper-rust" />
                  <span>Sample Valid Numbers for Quick Testing:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_VALID_AADHAARS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setAadhaarInput(sample)}
                      className="px-2 py-0.5 bg-paper-card hover:bg-paper-rust/10 border border-paper-border text-[10px] font-mono text-paper-ink hover:text-paper-rust rounded-sm transition-all cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isConnected || aadhaarValidation.state !== 'valid'}
                className="btn-editorial-rust font-heading w-full"
              >
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <Lightning size={16} weight="bold" />}
                <span>{loading ? 'VERIFYING CHECKSUM & BINDING…' : 'VERIFY & BIND IDENTITY'}</span>
              </button>
            </form>
          )}

          {/* TIER 2: 2-Step OTP Mode */}
          {mode === 'otp' && (
            <div className="space-y-4">
              {otpStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                      Bound Web3 Wallet
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={walletAddress || 'Wallet not connected'}
                      className="w-full bg-paper-surface border border-paper-border p-2.5 text-xs font-mono text-paper-ink rounded-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] text-paper-muted uppercase tracking-wide">
                        12-digit Aadhaar Number
                      </label>
                      <span className="text-[10px] text-paper-muted font-mono">
                        {cleanedAadhaar.length}/12 digits
                      </span>
                    </div>

                    <input
                      type="text"
                      value={aadhaarInput}
                      onChange={handleAadhaarChange}
                      placeholder="•••• •••• ••••"
                      className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2.5 text-xs text-paper-ink font-mono tracking-widest focus:outline-none"
                    />

                    {aadhaarValidation.state === 'valid' && (
                      <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-emerald-600 font-medium">
                        <CheckCircle size={14} weight="fill" />
                        <span>Valid Aadhaar format (Verhoeff checksum passed)</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !isConnected || aadhaarValidation.state !== 'valid'}
                    className="btn-editorial-rust font-heading w-full"
                  >
                    {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <DeviceMobile size={16} weight="bold" />}
                    <span>{loading ? 'SENDING OTP…' : 'SEND E-KYC OTP'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 bg-paper-surface border border-paper-border rounded-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-paper-muted uppercase block">OTP Sent To Mobile</span>
                      <span className="font-mono text-xs font-bold text-paper-ink">{maskedMobile}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-paper-rust font-mono text-xs font-bold bg-paper-rust/10 px-2 py-1 rounded-sm border border-paper-rust/20">
                      <Timer size={14} weight="bold" />
                      <span>{formatTime(timeLeft)}</span>
                    </div>
                  </div>

                  {demoOtp && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-300">
                        <Key size={14} weight="bold" />
                        <span className="text-[11px] font-medium">Demo Sandbox OTP:</span>
                        <span className="font-mono font-bold tracking-widest text-xs">{demoOtp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpInput(demoOtp)}
                        className="px-2 py-0.5 bg-amber-500 text-white rounded-sm text-[10px] font-bold font-heading hover:bg-amber-600 transition-all"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] text-paper-muted uppercase mb-1 tracking-wide">
                      Enter 6-digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      autoFocus
                      className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-center text-sm font-mono tracking-[0.5em] text-paper-ink focus:outline-none focus:border-paper-rust"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpStep(1)}
                      className="btn-editorial font-heading flex-1"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otpInput.length !== 6 || timeLeft <= 0}
                      className="btn-editorial-rust font-heading flex-2"
                    >
                      {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
                      <span>{loading ? 'VERIFYING…' : 'VERIFY & BIND'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Success Banner */}
          {bindResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-sm space-y-2 text-emerald-950 dark:text-emerald-200 text-xs">
              <div className="flex items-center space-x-1.5 font-heading font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={18} weight="fill" />
                <span>Identity Commitment Verified & Bound</span>
              </div>
              <p className="font-mono break-all text-[11px]">
                <span className="font-bold">Commitment:</span> {bindResult.commitment || bindResult.aadhaarHash}
              </p>
              <p className="font-body text-[11px] text-emerald-800 dark:text-emerald-300">
                {bindResult.verifiedVia || 'Verified via Verhoeff Checksum mathematical validation.'}
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm flex items-center space-x-2 text-red-700 dark:text-red-300 text-xs">
              <Warning size={16} weight="bold" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Status & Integrity Inspection */}
        <div className="space-y-4">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <Lock size={16} weight="bold" className="text-paper-rust" />
              <span>Check On-Chain Identity Binding</span>
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
              <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-paper-muted">Identity Status</span>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono ${
                    verifyResult.isBound
                      ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-600 border border-red-500/40'
                  }`}>
                    {verifyResult.isBound ? 'IDENTITY BOUND' : 'UNBOUND'}
                  </span>
                </div>
                <p className="font-mono truncate text-paper-ink">{verifyResult.wallet}</p>
                {verifyResult.boundAt && (
                  <p className="text-paper-muted font-mono text-[10px]">
                    Bound at: {new Date(verifyResult.boundAt).toLocaleString()}
                  </p>
                )}
                {verifyResult.isBound && (
                  <div className="pt-2 border-t border-paper-border/60 flex justify-end">
                    <button
                      type="button"
                      onClick={handleUnbind}
                      disabled={loading}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 text-[10px] font-heading font-bold rounded-sm flex items-center space-x-1 transition-all cursor-pointer"
                    >
                      <Trash size={12} weight="bold" />
                      <span>{loading ? 'UNLINKING…' : 'UNLINK / RESET IDENTITY'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2">
            <h4 className="font-heading text-xs font-bold text-paper-ink uppercase">How Verhoeff e-KYC Verification Works</h4>
            <ul className="text-xs text-paper-muted space-y-1.5 list-disc list-inside font-body">
              <li><strong className="text-paper-ink">Verhoeff Dihedral Checksum:</strong> Verifies the 12th mathematical check digit computed across the base-10 dihedral group $D_5$, detecting 100% of single-digit errors and over 95% of transposition errors.</li>
              <li><strong className="text-paper-ink">UIDAI Rule Enforcement:</strong> Rejects numbers starting with 0 or 1 and repeated sequence patterns.</li>
              <li><strong className="text-paper-ink">Zero PII Storage:</strong> Converts the valid Aadhaar into an irreversible HMAC-SHA256 commitment hash bound to your Ethereum wallet address.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AadhaarBinding;
