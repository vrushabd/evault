import React from 'react';
import { Fingerprint, ShieldCheck, Lock, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import AadhaarBinding from './AadhaarBinding';

export function AadhaarKycGate({
  walletAddress,
  isConnected,
  userName,
  onBindingSuccess,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-paper-bg/95 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
    >
      <div className="w-full max-w-4xl space-y-6">
        <div className="bg-paper-card border-2 border-paper-rust/40 p-6 shadow-offset-md rounded-sm text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-3 bg-paper-rust/10 border border-paper-rust/30 rounded-sm">
              <Lock size={28} weight="bold" className="text-paper-rust" />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">
              Mandatory Identity Verification
            </span>
            <h1 className="font-heading text-2xl font-bold text-paper-ink tracking-tight">
              Complete Aadhaar e-KYC to Continue
            </h1>
            <p className="text-sm text-paper-muted font-body max-w-xl mx-auto">
              Welcome{userName ? `, ${userName}` : ''}. Before you can upload, download, or manage
              legal documents in eVault, you must verify your identity using Aadhaar e-KYC.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-body text-paper-muted pt-1">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-surface border border-paper-border rounded-sm">
              <ShieldCheck size={14} weight="bold" className="text-emerald-600" />
              Privacy-preserving HMAC commitment
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-paper-surface border border-paper-border rounded-sm">
              <Fingerprint size={14} weight="bold" className="text-paper-rust" />
              Verhoeff checksum validated
            </span>
          </div>

          <div className="flex items-start justify-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm text-left max-w-lg mx-auto">
            <Warning size={18} weight="bold" className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200 font-body">
              Document services — upload, download, sharing, and filing — are locked until Aadhaar
              identity binding is complete. Case lookup and audit tools remain available after verification.
            </p>
          </div>
        </div>

        <AadhaarBinding
          walletAddress={walletAddress}
          isConnected={isConnected}
          onBindingSuccess={onBindingSuccess}
        />
      </div>
    </motion.div>
  );
}

export default AadhaarKycGate;
