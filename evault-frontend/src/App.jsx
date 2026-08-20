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
import AadhaarKycGate from './components/AadhaarKycGate';
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
} from '@phosphor-icons/react';

import { AnimatePresence, motion } from 'framer-motion';

const DOCUMENT_SERVICE_TABS = new Set(['lawyer-ws', 'judge-ws', 'client-ws', 'classifier']);

const roleDefaultTab = (userRole) => {
  const role = (userRole || '').toUpperCase();
  if (role === 'JUDGE') return 'judge-ws';
  if (role === 'CITIZEN' || role === 'CLIENT') return 'client-ws';
  if (role === 'POLICE') return 'ecourts';
  return 'lawyer-ws';
};

const getRoleAllowedTabs = (userRole) => {
  const role = (userRole || '').toUpperCase();
  if (role === 'CITIZEN' || role === 'CLIENT') {
    // Client strictly has access to 3 functionalities: Document Upload & My Vault (client-ws) and Audit (auth)
    return new Set(['client-ws', 'auth']);
  }
  if (role === 'JUDGE') {
    // Judge has access to all remaining functionalities (Orders, Documents, My Vault, Audit, Classify, Cases, Identity), but CANNOT create cases (enforced in ECourtsLookup)
    return new Set(['judge-ws', 'lawyer-ws', 'client-ws', 'auth', 'classifier', 'ecourts', 'aadhaar']);
  }
  if (role === 'POLICE' || role === 'LAWYER') {
    // Lawyer & Police have access to Documents, Cases (with Create Case), Classify, Audit, Identity, My Vault
    return new Set(['lawyer-ws', 'ecourts', 'classifier', 'auth', 'aadhaar', 'client-ws']);
  }
  return new Set(['lawyer-ws', 'client-ws', 'auth', 'classifier', 'ecourts', 'aadhaar']);
};

export function App() {
  const [activeTab, setActiveTab] = useState('lawyer-ws');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [aadhaarStatus, setAadhaarStatus] = useState(null);
  const [aadhaarChecking, setAadhaarChecking] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filingPrefill, setFilingPrefill] = useState(null);

  const isKycComplete = aadhaarStatus?.isBound === true;

  const checkWalletAadhaarBinding = async (addr) => {
    setAadhaarChecking(true);
    try {
      const res = await api.verifyAadhaar(addr);
      if (res.success) {
        setAadhaarStatus(res.data);
        return res.data;
      }
      const unbound = { wallet: addr, isBound: false };
      setAadhaarStatus(unbound);
      return unbound;
    } catch (e) {
      console.warn('Could not verify wallet identity binding:', e);
      const unbound = { wallet: addr, isBound: false };
      setAadhaarStatus(unbound);
      return unbound;
    } finally {
      setAadhaarChecking(false);
    }
  };

  // Restore existing authenticated session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('evault-token');
    const savedWallet = localStorage.getItem('evault-wallet');
    const savedRole = localStorage.getItem('evault-role');
    const savedName = localStorage.getItem('evault-name');

    if (token && savedWallet) {
      setAadhaarChecking(true);
      setWalletAddress(savedWallet);
      setIsConnected(true);
      const restoredUser = {
        walletAddress: savedWallet,
        role: savedRole || 'CLIENT',
        name: savedName || `${savedWallet.substring(0, 10)}…`,
      };
      setCurrentUser(restoredUser);
      setActiveTab(roleDefaultTab(savedRole));

      api.getUserRole(savedWallet).then((r) => {
        if (r && r !== savedRole) {
          applyRoleToUser(savedWallet, r);
        }
      }).catch(console.warn);
    }
  }, []);

  // Check identity binding when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      checkWalletAadhaarBinding(walletAddress);
    }
  }, [walletAddress]);

  // Guard active tab based on user role and KYC state
  useEffect(() => {
    if (!currentUser || aadhaarChecking) return;
    const allowed = getRoleAllowedTabs(currentUser.role);
    if (!allowed.has(activeTab)) {
      setActiveTab(roleDefaultTab(currentUser.role));
      return;
    }
    if (!isKycComplete && DOCUMENT_SERVICE_TABS.has(activeTab)) {
      // If user is client and KYC is incomplete, keep on aadhaar or client-ws if simulated
      setActiveTab('aadhaar');
    }
  }, [currentUser, aadhaarChecking, isKycComplete, activeTab]);

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

  // Completely clears eVault session, cache, and locks the system
  const handleLogout = async () => {
    // 0. Log audit event before clearing user session
    if (currentUser) {
      api.logAuditEvent({
        action: 'VAULT_SESSION_LOCKED',
        service: 'Auth',
        performedBy: currentUser.walletAddress || walletAddress || '0xDemoWallet',
        role: currentUser.role || 'CLIENT',
        userName: currentUser.name || 'Authorized User',
        details: `User ${currentUser.name || 'Authorized User'} (${currentUser.role || 'CLIENT'}) signed out. Session locked.`,
      }).catch(console.warn);
    }

    // 1. Clear session and user keys from localStorage
    localStorage.removeItem('evault-token');
    localStorage.removeItem('evault-wallet');
    localStorage.removeItem('evault-role');
    localStorage.removeItem('evault-name');
    localStorage.removeItem('evault-email');

    // 2. Clear entire sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn('sessionStorage clear error:', e);
    }

    // 3. Purge browser CacheStorage API if available
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      } catch (e) {
        console.warn('CacheStorage clear error:', e);
      }
    }

    // 4. Revoke connected permissions from MetaMask so wallet disconnects completely
    if (typeof window !== 'undefined' && window.ethereum?.request) {
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch (e) {
        console.warn('MetaMask permission revoke note:', e);
      }
    }

    // 5. Reset application memory state
    setWalletAddress('');
    setIsConnected(false);
    setCurrentUser(null);
    setAadhaarStatus(null);
    setAadhaarChecking(false);
    setFilingPrefill(null);

    console.log('eVault session and browser cache cleared. System locked.');
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

  const handleAuthenticateSuccess = async (userData) => {
    setCurrentUser(userData);
    setIsConnected(true);
    setWalletAddress(userData.walletAddress);

    // Record real-time audit ledger entry for vault access
    api.logAuditEvent({
      action: 'VAULT_ACCESS_GRANTED',
      service: 'Auth',
      performedBy: userData.walletAddress || '0xDemoWallet',
      role: userData.role || 'CLIENT',
      userName: userData.name || 'Authorized User',
      details: `User ${userData.name || 'Authorized User'} (${userData.role || 'CLIENT'}) successfully authenticated with credentials and entered eVault. Bound Wallet: ${userData.walletAddress || '0xDemoWallet'}`,
    }).catch(console.warn);

    const status = userData.walletAddress
      ? await checkWalletAadhaarBinding(userData.walletAddress)
      : null;

    const userRole = (userData.role || '').toUpperCase();
    if (status?.isBound) {
      setActiveTab(roleDefaultTab(userRole));
    } else {
      setActiveTab('aadhaar');
    }
  };

  const handleKycSuccess = async () => {
    if (!walletAddress) return;
    const status = await checkWalletAadhaarBinding(walletAddress);
    if (status?.isBound) {
      const userRole = (currentUser?.role || '').toUpperCase();
      setActiveTab(roleDefaultTab(userRole));
    }
  };

  const handleTabChange = (tabId) => {
    const allowed = getRoleAllowedTabs(currentUser?.role);
    if (!allowed.has(tabId)) {
      return;
    }
    if (DOCUMENT_SERVICE_TABS.has(tabId) && !isKycComplete) {
      setActiveTab('aadhaar');
      return;
    }
    setActiveTab(tabId);
  };

  const tabBtn = (id, icon, label, requiresKyc = false) => {
    const allowed = getRoleAllowedTabs(currentUser?.role);
    if (!allowed.has(id)) return null;

    const locked = requiresKyc && !isKycComplete;
    return (
      <button
        key={id}
        type="button"
        onClick={() => handleTabChange(id)}
        disabled={locked}
        title={locked ? 'Complete Aadhaar e-KYC to unlock' : undefined}
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] transition-all ${
          activeTab === id
            ? 'border-paper-rust/30 bg-paper-rust/10 text-paper-rust font-semibold'
            : locked
              ? 'border-transparent text-paper-muted/45 cursor-not-allowed'
              : 'border-transparent text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
        }`}
      >
        {icon}
        <span>{label}</span>
        {locked && <Lock size={12} weight="bold" className="opacity-60" />}
      </button>
    );
  };

  const isLocked = !currentUser;
  const isKycLocked = Boolean(currentUser) && !aadhaarChecking && !isKycComplete;

  if (isLocked) {
    return (
      <div className="min-h-[100dvh] bg-paper-bg text-paper-ink font-body selection:bg-paper-rust selection:text-white">
        <AnimatePresence>
          <UserAuthGate
            walletAddress={walletAddress}
            isConnected={isConnected}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleLogout}
            onAuthenticateSuccess={handleAuthenticateSuccess}
          />
        </AnimatePresence>
      </div>
    );
  }

  const userRole = (currentUser?.role || '').toUpperCase();
  const isClientRole = userRole === 'CLIENT' || userRole === 'CITIZEN';

  return (
    <div className="min-h-[100dvh] bg-paper-bg text-paper-ink flex flex-col font-body selection:bg-paper-rust selection:text-white">
      {/* Mandatory Aadhaar e-KYC Gate (after sign-in) */}
      <AnimatePresence>
        {aadhaarChecking && currentUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-paper-bg/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex items-center gap-3 text-sm text-paper-muted font-body">
              <Fingerprint size={22} weight="bold" className="text-paper-rust animate-pulse" />
              <span>Verifying Aadhaar identity status…</span>
            </div>
          </motion.div>
        )}
        {isKycLocked && (
          <AadhaarKycGate
            walletAddress={walletAddress}
            isConnected={isConnected}
            userName={currentUser?.name}
            onBindingSuccess={handleKycSuccess}
          />
        )}
      </AnimatePresence>

      {/* Main Top Navigation */}
      <Navbar
        walletAddress={walletAddress}
        isConnected={isConnected && !isLocked}
        userRole={currentUser?.role}
        onConnectWallet={handleConnectWallet}
        onLogout={handleLogout}
        aadhaarStatus={aadhaarStatus}
        onOpenIdentity={() => {
          if (getRoleAllowedTabs(currentUser?.role).has('aadhaar')) {
            setActiveTab('aadhaar');
          }
        }}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Navigation Workspace Ribbon */}
        <div className="bg-paper-card/80 border border-paper-border rounded-lg p-1.5">
            <nav className="flex flex-wrap gap-1 font-heading font-medium" aria-label="Workspace navigation">

              {/* JUDGE: Orders Tab */}
              {tabBtn(
                'judge-ws',
                <Gavel size={14} weight="bold" />,
                'Orders',
                true
              )}

              {/* LAWYER / POLICE / JUDGE: Documents Filing Tab */}
              {tabBtn(
                'lawyer-ws',
                <FileText size={14} weight="bold" />,
                'Documents',
                true
              )}

              {/* ALL ROLES: My Vault Tab */}
              {tabBtn(
                'client-ws',
                <User size={14} weight="bold" />,
                isClientRole ? 'My Vault & Upload' : 'My Vault',
                true
              )}

              {/* ALL ROLES: Audit Tab */}
              {tabBtn(
                'auth',
                <ShieldCheck size={14} weight="bold" />,
                'Audit'
              )}

              {/* LAWYER / POLICE / JUDGE: AI Classifier Tab */}
              {tabBtn(
                'classifier',
                <Sparkle size={14} weight="bold" />,
                'Classify',
                true
              )}

              {/* LAWYER / POLICE / JUDGE: Cases / eCourts Registry Tab */}
              {tabBtn(
                'ecourts',
                <Scales size={14} weight="bold" />,
                'Cases'
              )}

              {/* LAWYER / POLICE / JUDGE: Identity Tab */}
              {tabBtn(
                'aadhaar',
                <Fingerprint size={14} weight="bold" />,
                'Identity'
              )}
            </nav>
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
            {activeTab === 'classifier' && isKycComplete && (
              <ClassifierModule
                onSecureDocument={(meta) => {
                  setFilingPrefill(meta);
                  setActiveTab('lawyer-ws');
                }}
              />
            )}

            {activeTab === 'ecourts' && (
              <ECourtsLookup currentUser={currentUser} />
            )}

            {activeTab === 'aadhaar' && (
              <AadhaarBinding
                walletAddress={walletAddress}
                isConnected={isConnected}
                onBindingSuccess={() => {
                  checkWalletAadhaarBinding(walletAddress);
                  handleKycSuccess();
                }}
              />
            )}

            {activeTab === 'auth' && (
              <AuthAndAuditModule
                currentUser={currentUser}
                walletAddress={walletAddress}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'judge-ws' && isKycComplete && (
              <JudgeDashboard
                currentUser={currentUser}
              />
            )}

            {activeTab === 'lawyer-ws' && isKycComplete && (
              <LawyerDashboard
                currentUser={currentUser}
                walletAddress={walletAddress}
                prefill={filingPrefill}
              />
            )}

            {activeTab === 'client-ws' && isKycComplete && (
              <ClientDashboard
                walletAddress={walletAddress}
                currentUser={currentUser}
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
