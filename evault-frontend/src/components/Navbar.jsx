import React from 'react';
import { Scales, Wallet, Cpu, CheckCircle, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';

export function Navbar({ walletAddress, isConnected, onConnectWallet, aadhaarStatus }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-paper-bg/95 border-b border-paper-border backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Editorial Monogram */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 border border-paper-border-dark bg-paper-card flex items-center justify-center shadow-offset-sm rounded-sm">
            <Scales size={20} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-heading text-lg font-bold text-paper-ink tracking-tight">eVault</span>
              <span className="text-[10px] font-mono font-semibold uppercase bg-paper-surface text-paper-ink border border-paper-border px-2 py-0.5 rounded-sm">
                SIH260229
              </span>
            </div>
            <p className="text-[11px] text-paper-muted font-body hidden sm:block">
              Blockchain Legal Records · Ministry of Law & Justice
            </p>
          </div>
        </div>

        {/* Status Indicators & Web3 Button */}
        <div className="flex items-center space-x-4">
          
          {/* Dark Mode Toggle */}
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-sm border border-paper-border-dark bg-paper-card text-paper-ink shadow-offset-sm hover:-translate-y-px hover:-translate-x-px hover:shadow-offset active:translate-y-px active:translate-x-px active:shadow-none transition-all"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>

          {/* Gateway status label */}
          <div className="hidden md:flex items-center space-x-2 bg-paper-surface border border-paper-border px-3 py-1.5 rounded-sm text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-paper-rust"></span>
            <span className="text-paper-muted">Gateway:</span>
            <span className="text-paper-ink font-semibold">8080</span>
          </div>

          {/* Aadhaar Binding Pill */}
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

          {/* Web3 Wallet Button */}
          <button
            onClick={onConnectWallet}
            className={isConnected ? "btn-editorial font-mono" : "btn-editorial-rust font-mono"}
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
