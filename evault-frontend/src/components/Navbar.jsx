import React from 'react';
import { Scales, Wallet, Fingerprint, Moon, Sun, SignOut } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';

export function Navbar({ walletAddress, isConnected, userRole, onConnectWallet, onLogout, aadhaarStatus, onOpenIdentity }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 bg-paper-bg/90 border-b border-paper-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border border-paper-border bg-paper-card flex items-center justify-center rounded-md">
            <Scales size={20} weight="bold" className="text-paper-rust" />
          </div>
          <div>
            <span className="font-heading text-lg font-bold text-paper-ink tracking-tight">eVault</span>
            <p className="text-[11px] text-paper-muted font-body hidden md:block">
              Secure Legal Document Vault
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-paper-border bg-paper-card text-paper-ink hover:bg-paper-surface transition-all"
            aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
            aria-pressed={theme === 'dark'}
            title={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          >
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
          </button>

          {isConnected && (
            <button
              type="button"
              onClick={onOpenIdentity}
              title={aadhaarStatus?.isBound ? 'Identity bound — Click to view identity status' : 'Identity unbound — Click to bind Aadhaar identity'}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-md border text-[11px] font-heading cursor-pointer transition-all hover:-translate-y-px ${
                aadhaarStatus?.isBound
                  ? 'bg-paper-emerald/10 border-paper-emerald/30 text-paper-emerald hover:bg-paper-emerald/20'
                  : 'bg-paper-rust/10 border-paper-rust/30 text-paper-rust hover:bg-paper-rust/20'
              }`}
            >
              <Fingerprint size={14} weight="bold" />
              <span>{aadhaarStatus?.isBound ? 'Identity ready' : 'Verify identity'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onConnectWallet}
            className={`${isConnected ? 'btn-editorial' : 'btn-editorial-rust'} h-9 font-heading`}
          >
            <Wallet size={16} weight="bold" />
            <span className={isConnected ? 'font-mono text-[11px]' : ''}>
              {isConnected
                ? `${walletAddress.substring(0, 6)}…${walletAddress.substring(walletAddress.length - 4)}`
                : 'Connect wallet'}
            </span>
          </button>

          {isConnected && userRole && (
            <span
              className="hidden xl:inline-flex h-7 items-center rounded border border-paper-border bg-paper-surface px-2 text-[10px] font-mono font-bold text-paper-muted"
              title={`Signed in as ${userRole}`}
            >
              {userRole}
            </span>
          )}

          {isConnected && (
            <button
              type="button"
              onClick={onLogout}
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-paper-border bg-paper-card text-[11px] font-heading font-semibold text-paper-ink hover:-translate-y-px hover:bg-paper-rust hover:border-paper-rust hover:text-white transition-all"
              title="Lock System & Logout"
            >
              <SignOut size={14} weight="bold" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
