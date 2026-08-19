import React, { useState, useEffect } from 'react';
import { Scales, Wallet, Fingerprint, Moon, Sun, LockKey } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export function Navbar({ walletAddress, isConnected, onConnectWallet, aadhaarStatus, onOpenIdentity }) {
  const { theme, toggleTheme } = useTheme();
  const [health, setHealth] = useState({ gateway: null, blockchain: null, audit: null });

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        const checks = await api.getSystemHealth();
        if (!cancelled) setHealth(checks);
      } catch {
        if (!cancelled) setHealth({ gateway: false, blockchain: false, audit: false });
      }
    };
    ping();
    const id = setInterval(ping, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const Dot = ({ ok }) => (
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        ok === null ? 'bg-paper-muted' : ok ? 'bg-emerald-500' : 'bg-red-500'
      }`}
    />
  );

  return (
    <header className="sticky top-0 z-50 bg-paper-bg/95 border-b border-paper-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 border border-paper-border-dark bg-paper-card flex items-center justify-center shadow-offset-sm rounded-sm">
            <Scales size={20} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold text-paper-ink tracking-tight">eVault</span>
            <p className="text-[11px] text-paper-muted font-body hidden sm:block">
              Secure Legal Document Vault
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-sm border border-paper-border-dark bg-paper-card text-paper-ink shadow-offset-sm hover:-translate-y-px transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>

          <div className="hidden lg:flex items-center gap-3 bg-paper-surface border border-paper-border px-3 py-1.5 rounded-sm text-[10px] font-heading tracking-wide uppercase">
            <span className="flex items-center gap-1.5 text-paper-ink">
              <Dot ok={health.gateway} /> System {health.gateway ? 'online' : health.gateway === false ? 'offline' : '…'}
            </span>
            <span className="flex items-center gap-1.5 text-paper-ink">
              <Dot ok={health.blockchain} /> Sepolia {health.blockchain ? 'connected' : health.blockchain === false ? 'offline' : '…'}
            </span>
            <span className="flex items-center gap-1.5 text-paper-ink">
              <Dot ok={true} />
              <LockKey size={11} weight="bold" className="text-emerald-600" />
              Encryption active
            </span>
          </div>

          {isConnected && (
            <button
              type="button"
              onClick={onOpenIdentity}
              title={aadhaarStatus?.isBound ? 'Identity bound — Click to view identity status' : 'Identity unbound — Click to bind Aadhaar identity'}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-sm border text-[10px] font-heading uppercase tracking-wide cursor-pointer transition-all hover:-translate-y-px shadow-offset-sm ${
                aadhaarStatus?.isBound
                  ? 'bg-paper-emerald/10 border-paper-emerald/30 text-paper-emerald hover:bg-paper-emerald/20'
                  : 'bg-paper-rust/10 border-paper-rust/30 text-paper-rust hover:bg-paper-rust/20'
              }`}
            >
              <Fingerprint size={14} weight="bold" />
              <span>{aadhaarStatus?.isBound ? 'Identity bound' : 'Identity unbound'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onConnectWallet}
            className={isConnected ? 'btn-editorial font-heading' : 'btn-editorial-rust font-heading'}
          >
            <Wallet size={16} weight="bold" />
            <span className={isConnected ? 'font-mono text-[11px]' : ''}>
              {isConnected
                ? `${walletAddress.substring(0, 6)}…${walletAddress.substring(walletAddress.length - 4)}`
                : 'Connect wallet'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
