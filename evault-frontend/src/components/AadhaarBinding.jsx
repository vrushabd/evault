import React, { useState, useEffect } from 'react';
import { Cpu, Key, Lock, CheckCircle, Warning, ArrowsClockwise, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react';
import api from '../services/api';

export function AadhaarBinding({ walletAddress, isConnected, onBindingSuccess }) {
  const [aadhaarInput, setAadhaarInput] = useState('');
  const [showRawAadhaar, setShowRawAadhaar] = useState(false);
  const [liveHash, setLiveHash] = useState('');
  const [verifyWallet, setVerifyWallet] = useState(walletAddress || '');
  
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [bindResult, setBindResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (walletAddress) {
      setVerifyWallet(walletAddress);
    }
  }, [walletAddress]);

  useEffect(() => {
    const cleaned = aadhaarInput.replace(/\D/g, '');
    if (cleaned.length === 12) {
      async function computeHash() {
        const msgUint8 = new TextEncoder().encode(cleaned);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setLiveHash(hashHex);
      }
      computeHash();
    } else {
      setLiveHash('');
    }
  }, [aadhaarInput]);

  const handleBind = async (e) => {
    e.preventDefault();
    const cleanedAadhaar = aadhaarInput.replace(/\D/g, '');
    
    if (cleanedAadhaar.length !== 12) {
      setError("Aadhaar number must be exactly 12 numeric digits.");
      return;
    }
    
    if (!walletAddress) {
      setError("Please connect your Web3 wallet first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await api.bindAadhaar(cleanedAadhaar, walletAddress);
      if (response.success) {
        setBindResult(response.data);
        if (onBindingSuccess) onBindingSuccess(response.data);
      } else {
        setError(response.error || "Binding failed.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to bind Aadhaar.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyWallet.trim()) return;
    setVerifyLoading(true);
    try {
      const response = await api.verifyAadhaar(verifyWallet);
      if (response.success) {
        setVerifyResult(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Verification failed.");
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-paper-surface border border-paper-ink rounded-sm">
            <Cpu size={22} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">03 / ZERO-KNOWLEDGE IDENTITY PROOF</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">Cryptographic Aadhaar Identity Binding</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        
        {/* Binding Form */}
        <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          <div className="flex items-center justify-between border-b border-paper-border pb-3">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2">
              <Key size={16} weight="bold" className="text-paper-rust" />
              <span>Generate Aadhaar SHA-256 Digest</span>
            </h3>
            <span className="text-[10px] font-mono bg-paper-surface text-paper-ink border border-paper-border px-2 py-0.5 rounded-sm font-bold">
              SHA-256
            </span>
          </div>

          <form onSubmit={handleBind} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-paper-muted uppercase mb-1">TARGET WEB3 WALLET</label>
              <input
                type="text"
                readOnly
                value={walletAddress || 'Wallet Not Connected'}
                className="w-full bg-paper-surface border border-paper-border p-2.5 text-xs font-mono text-paper-ink rounded-sm cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-paper-muted uppercase mb-1">12-DIGIT AADHAAR NUMBER</label>
              <div className="relative">
                <input
                  type={showRawAadhaar ? "text" : "password"}
                  maxLength={12}
                  value={aadhaarInput}
                  onChange={(e) => setAadhaarInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 12-digit Aadhaar number..."
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

            {liveHash && (
              <div className="bg-paper-surface border border-paper-rust/40 p-3 rounded-sm space-y-1 font-mono">
                <span className="text-[10px] text-paper-rust uppercase font-bold">CLIENT SHA-256 DIGEST STREAM</span>
                <p className="text-[11px] text-paper-ink break-all">{liveHash}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isConnected || aadhaarInput.length !== 12}
              className="btn-editorial-rust font-mono w-full"
            >
              {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <ShieldCheck size={16} weight="bold" />}
              <span>{loading ? 'GENERATING HASH...' : 'BIND AADHAAR HASH TO WALLET'}</span>
            </button>
          </form>

          {bindResult && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-sm space-y-2 text-emerald-950 font-mono">
              <div className="flex items-center space-x-1.5 font-bold">
                <CheckCircle size={18} weight="fill" className="text-emerald-700" />
                <span>AADHAAR HASH SUCCESSFULLY BOUND</span>
              </div>
              <p className="text-[11px]"><span className="text-emerald-700 font-bold">Hash:</span> {bindResult.aadhaarHash}</p>
              <p className="text-[11px]"><span className="text-emerald-700 font-bold">Wallet:</span> {bindResult.walletAddress}</p>
              <p className="text-[11px]"><span className="text-emerald-700 font-bold">Bound At:</span> {bindResult.boundAt}</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-sm flex items-center space-x-2 text-red-800 text-xs font-mono">
              <Warning size={16} weight="bold" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Verification Box */}
        <div className="space-y-4">
          <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4">
            <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
              <Lock size={16} weight="bold" className="text-paper-rust" />
              <span>Verify Wallet Aadhaar Binding</span>
            </h3>

            <div className="flex gap-2 font-mono">
              <input
                type="text"
                value={verifyWallet}
                onChange={(e) => setVerifyWallet(e.target.value)}
                placeholder="Ethereum Wallet Address (0x...)"
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button
                onClick={handleVerify}
                disabled={verifyLoading || !verifyWallet}
                className="btn-editorial font-mono"
              >
                {verifyLoading ? 'CHECKING...' : 'VERIFY'}
              </button>
            </div>

            {verifyResult && (
              <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm space-y-1.5 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-paper-muted">Binding State:</span>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                    verifyResult.isBound 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-red-100 text-red-900 border border-red-300'
                  }`}>
                    {verifyResult.isBound ? 'BOUND' : 'UNBOUND'}
                  </span>
                </div>
                <p className="text-paper-ink truncate">Wallet: {verifyResult.wallet}</p>
                {verifyResult.boundAt && (
                  <p className="text-paper-muted">Bound At: {verifyResult.boundAt}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2">
            <h4 className="font-heading text-xs font-bold text-paper-ink uppercase">Identity Security Architecture</h4>
            <ul className="text-xs text-paper-muted space-y-1 list-disc list-inside font-body">
              <li>Irreversible SHA-256 one-way hashing protocol.</li>
              <li>Protects citizen identity privacy while proving unique identity ownership.</li>
              <li>Compatible with Ethereum smart contracts and the legal audit trail.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
export default AadhaarBinding;
