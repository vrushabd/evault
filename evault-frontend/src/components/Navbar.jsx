import React, { useState, useEffect } from 'react';
import { Scales, Wallet, Cpu, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';

export function Navbar({ walletAddress, isConnected, onConnectWallet, aadhaarStatus }) {
  const { theme, toggleTheme } = useTheme();
  const [gatewayUp, setGatewayUp] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      try {
        // Same-origin Vite proxy → gateway (avoids browser CORS on :8080)
        const res = await fetch('/actuator/health', { signal: AbortSignal.timeout(4000) });
        if (!cancelled) setGatewayUp(res.ok);
      } catch {
        if (!cancelled) setGatewayUp(false);
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const statusDot =
    gatewayUp === null
      ? 'bg-paper-muted'
      : gatewayUp
        ? 'bg-emerald-500'
        : 'bg-red-500';

  return (
    <header className="sticky top-0 z-50 bg-paper-bg/95 border-b border-paper-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 border border-paper-border-dark bg-paper-card flex items-center justify-center shadow-offset-sm rounded-sm">
            <Scales size={20} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading text-lg font-bold text-paper-ink tracking-tight">eVault</span>
            </div>
            <p className="text-[11px] text-paper-muted font-body hidden sm:block">
              Blockchain Legal Records
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-sm border border-paper-border-dark bg-paper-card text-paper-ink shadow-offset-sm hover:-translate-y-px hover:-translate-x-px hover:shadow-offset active:translate-y-px active:translate-x-px active:shadow-none transition-all"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>

          <div className="hidden md:flex items-center space-x-2 bg-paper-surface border border-paper-border px-3 py-1.5 rounded-sm text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${statusDot}`}></span>
            <span className="text-paper-muted">API:</span>
            <span className="text-paper-ink font-semibold">
              {gatewayUp === null ? '…' : gatewayUp ? 'Online' : 'Offline'}
            </span>
          </div>

          {isConnected && (
            <div className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-sm border text-xs font-mono ${
              aadhaarStatus?.isBound
                ? 'bg-paper-emerald/10 border-paper-emerald/30 text-paper-emerald'
                : 'bg-paper-rust/10 border-paper-rust/30 text-paper-rust'
            }`}>
              <Cpu size={14} weight="bold" />
              <span>Aadhaar: {aadhaarStatus?.isBound ? 'BOUND' : 'UNBOUND'}</span>
            </div>
          )}

          <button
            onClick={onConnectWallet}
            className={isConnected ? 'btn-editorial font-mono' : 'btn-editorial-rust font-mono'}
          >
            <Wallet size={16} weight="bold" />
            <span>
              {isConnected
                ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
                : 'CONNECT WALLET'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
export default Navbar;
