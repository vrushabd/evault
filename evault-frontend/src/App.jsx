import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ClassifierModule from './components/ClassifierModule';
import ECourtsLookup from './components/ECourtsLookup';
import AadhaarBinding from './components/AadhaarBinding';
import AuthAndAuditModule from './components/AuthAndAuditModule';
import JudgeDashboard from './components/JudgeDashboard';
import LawyerDashboard from './components/LawyerDashboard';
import ClientDashboard from './components/ClientDashboard';
import UserAuthGate from './components/UserAuthGate';
import api from './services/api';

import {
  Sparkle,
  Scales,
  Fingerprint,
  ShieldCheck,
  User,
  Gavel,
  FileText,
  Lock,
  SignOut,
} from '@phosphor-icons/react';

import { AnimatePresence, motion } from 'framer-motion';

export function App() {
  const [activeTab, setActiveTab] = useState('lawyer-ws');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [aadhaarStatus, setAadhaarStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [filingPrefill, setFilingPrefill] = useState(null);

  // Check identity binding when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      checkWalletAadhaarBinding(walletAddress);
    }
  }, [walletAddress]);

  // Restore existing authenticated session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('evault-token');
    const savedWallet = localStorage.getItem('evault-wallet');
    const savedRole = localStorage.getItem('evault-role');
    const savedName = localStorage.getItem('evault-name');

    if (token && savedWallet) {
      setWalletAddress(savedWallet);
      setIsConnected(true);
      const restoredUser = {
        walletAddress: savedWallet,
        role: savedRole || 'CLIENT',
        name: savedName || `${savedWallet.substring(0, 10)}…`,
      };
      setCurrentUser(restoredUser);

      // Set default tab based on restored role
      if (savedRole === 'JUDGE') setActiveTab('judge-ws');
      else if (savedRole === 'CITIZEN' || savedRole === 'CLIENT') setActiveTab('client-ws');
      else setActiveTab('lawyer-ws');

      // Refresh role in background if available
      api.getUserRole(savedWallet).then((r) => {
        if (r && r !== savedRole) {
          applyRoleToUser(savedWallet, r);
        }
      }).catch(console.warn);
    }
  }, []);

  const checkWalletAadhaarBinding = async (addr) => {
    try {
      const res = await api.verifyAadhaar(addr);
      if (res.success) {
        setAadhaarStatus(res.data);
      }
    } catch (e) {
      console.warn('Could not verify wallet identity binding:', e);
    }
  };

  const applyRoleToUser = (address, role, fallbackRole = 'CLIENT') => {
    const resolved = typeof role === 'string' && role ? role : fallbackRole;
    const currentStoredName = localStorage.getItem('evault-name');
    localStorage.setItem('evault-wallet', address);
    localStorage.setItem('evault-role', resolved);

    setCurrentUser({
      walletAddress: address,
      role: resolved,
      name: currentStoredName || `${address.substring(0, 10)}…`,
    });
  };

  // Completely clears eVault session & locks the system
  const handleLogout = () => {
    localStorage.removeItem('evault-token');
    localStorage.removeItem('evault-wallet');
    localStorage.removeItem('evault-role');
    localStorage.removeItem('evault-name');

    setWalletAddress('');
    setIsConnected(false);
    setCurrentUser(null);
    setAadhaarStatus(null);
    setFilingPrefill(null);

    console.log('eVault session cleared. System locked.');
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask extension is required to connect to eVault.');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (err) {
      console.warn('MetaMask connection error or cancelled:', err);
    }
  };

  const handleAuthenticateSuccess = (userData) => {
    setCurrentUser(userData);
    setIsConnected(true);
    setWalletAddress(userData.walletAddress);

    // Automatically navigate to the role's appropriate workspace
    const userRole = (userData.role || '').toUpperCase();
    if (userRole === 'JUDGE') {
      setActiveTab('judge-ws');
    } else if (userRole === 'CITIZEN' || userRole === 'CLIENT') {
      setActiveTab('client-ws');
    } else {
      setActiveTab('lawyer-ws');
    }

    if (userData.walletAddress) {
      checkWalletAadhaarBinding(userData.walletAddress);
    }
  };

  const tabBtn = (id, icon, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all text-xs ${
        activeTab === id
          ? 'bg-paper-rust text-white font-bold shadow-offset-sm'
          : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const role = (currentUser?.role || '').toUpperCase();

  // If the user has not authenticated, display the mandatory Locking Authentication Portal
  const isLocked = !currentUser;

  return (
    <div className="min-h-[100dvh] bg-paper-bg text-paper-ink flex flex-col font-body selection:bg-paper-rust selection:text-white">
      {/* Locked Authentication Gate */}
      <AnimatePresence>
        {isLocked && (
          <UserAuthGate
            walletAddress={walletAddress}
            isConnected={isConnected}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleLogout}
            onAuthenticateSuccess={handleAuthenticateSuccess}
          />
        )}
      </AnimatePresence>

      {/* Main Top Navigation */}
      <Navbar
        walletAddress={walletAddress}
        isConnected={isConnected && !isLocked}
        onConnectWallet={handleConnectWallet}
        aadhaarStatus={aadhaarStatus}
        onOpenIdentity={() => setActiveTab('aadhaar')}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        {/* Navigation Workspace Ribbon */}
        <div className="bg-paper-card border border-paper-border p-1.5 shadow-offset-sm rounded-sm space-y-2">
          <div className="flex flex-wrap gap-1 font-heading text-xs font-semibold px-1 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-paper-muted self-center px-2">
              Workspace
            </span>

            {tabBtn(
              'lawyer-ws',
              <FileText size={15} weight="bold" />,
              'Documents'
            )}

            {tabBtn(
              'judge-ws',
              <Gavel size={15} weight="bold" />,
              'Orders'
            )}

            {tabBtn(
              'client-ws',
              <User size={15} weight="bold" />,
              'My Vault'
            )}

            {tabBtn(
              'auth',
              <ShieldCheck size={15} weight="bold" />,
              'Audit Trail'
            )}
          </div>

          <div className="flex flex-wrap gap-1 font-heading text-xs font-semibold border-t border-paper-border/60 px-1 pt-2">
            <span className="text-[10px] uppercase tracking-wider text-paper-muted self-center px-2">
              Tools
            </span>

            {tabBtn(
              'classifier',
              <Sparkle size={15} weight="bold" />,
              'AI Classify'
            )}

            {tabBtn(
              'ecourts',
              <Scales size={15} weight="bold" />,
              'Cases'
            )}

            {tabBtn(
              'aadhaar',
              <Fingerprint size={15} weight="bold" />,
              'Identity'
            )}
          </div>

          {role && (
            <div className="flex items-center justify-between px-3 pb-1 border-t border-paper-border/30 pt-1.5">
              <p className="text-[10px] text-paper-muted font-body">
                Authenticated Identity:{' '}
                <span className="font-bold text-paper-rust">
                  {currentUser?.name || 'Authorized User'}
                </span>{' '}
                (<span className="font-mono text-paper-ink">{role}</span>)
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="text-[10px] font-mono text-paper-muted hover:text-paper-rust transition flex items-center space-x-1"
                title="Lock System & Logout"
              >
                <SignOut size={12} weight="bold" />
                <span>LOCK & LOGOUT</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab View Container */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'classifier' && (
              <ClassifierModule
                onSecureDocument={(meta) => {
                  setFilingPrefill(meta);
                  setActiveTab('lawyer-ws');
                }}
              />
            )}

            {activeTab === 'ecourts' && (
              <ECourtsLookup />
            )}

            {activeTab === 'aadhaar' && (
              <AadhaarBinding
                walletAddress={walletAddress}
                isConnected={isConnected}
                onBindingSuccess={() =>
                  checkWalletAadhaarBinding(walletAddress)
                }
              />
            )}

            {activeTab === 'auth' && (
              <AuthAndAuditModule
                currentUser={currentUser}
                walletAddress={walletAddress}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'judge-ws' && (
              <JudgeDashboard
                currentUser={currentUser}
              />
            )}

            {activeTab === 'lawyer-ws' && (
              <LawyerDashboard
                currentUser={currentUser}
                walletAddress={walletAddress}
                prefill={filingPrefill}
              />
            )}

            {activeTab === 'client-ws' && (
              <ClientDashboard
                walletAddress={walletAddress}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-paper-border bg-paper-card py-5 text-xs text-paper-muted font-body">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck
              size={18}
              weight="bold"
              className="text-paper-rust"
            />
            <span className="font-heading font-semibold text-paper-ink">
              eVault
            </span>
            <span>· Secure Legal Document Vault</span>
          </div>

          <div className="text-[11px]">
            Encrypted storage · Blockchain integrity · Role-based access
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;