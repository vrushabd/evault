import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ClassifierModule from './components/ClassifierModule';
import ECourtsLookup from './components/ECourtsLookup';
import AadhaarBinding from './components/AadhaarBinding';
import AuthAndAuditModule from './components/AuthAndAuditModule';
import JudgeDashboard from './components/JudgeDashboard';
import LawyerDashboard from './components/LawyerDashboard';
import ClientDashboard from './components/ClientDashboard';
import api from './services/api';

import {
  Sparkle,
  Scales,
  Fingerprint,
  ShieldCheck,
  User,
  Gavel,
  FileText,
} from '@phosphor-icons/react';

import { AnimatePresence, motion } from 'framer-motion';

export function App() {
  const [activeTab, setActiveTab] = useState('lawyer-ws');

  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [aadhaarStatus, setAadhaarStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [filingPrefill, setFilingPrefill] = useState(null);

  useEffect(() => {
    if (walletAddress) {
      checkWalletAadhaarBinding(walletAddress);
    }
  }, [walletAddress]);

  const checkWalletAadhaarBinding = async (addr) => {
    try {
      const res = await api.verifyAadhaar(addr);

      if (res.success) {
        setAadhaarStatus(res.data);
      }
    } catch (e) {
      console.warn(
        'Could not verify wallet identity binding:',
        e
      );
    }
  };

  const applyRoleToUser = (
    address,
    role,
    fallbackRole = 'CLIENT'
  ) => {
    const resolved =
      typeof role === 'string' && role
        ? role
        : fallbackRole;

    setCurrentUser({
      walletAddress: address,
      role: resolved,
      name: `${address.substring(0, 10)}…`,
    });
  };

  // Properly clears the entire eVault session
  const handleLogout = () => {
    // Remove JWT
    localStorage.removeItem('evault-token');

    // Reset application authentication state
    setWalletAddress('');
    setIsConnected(false);
    setCurrentUser(null);
    setAadhaarStatus(null);
    setFilingPrefill(null);

    console.log('eVault session cleared.');
  };

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is required to authenticate.');
      return;
    }

    try {
      /*
       * IMPORTANT:
       * Always remove any old authentication token before
       * starting a new authentication flow.
       */
      localStorage.removeItem('evault-token');

      /*
       * Reset current application authentication state.
       * This ensures every login starts fresh.
       */
      setCurrentUser(null);
      setIsConnected(false);

      // Request wallet connection
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || !accounts.length) {
        return;
      }

      const address = accounts[0];

      /*
       * STEP 1:
       * Request a fresh nonce from the backend.
       */
      const nonce = await api.getNonce(address);

      /*
       * STEP 2:
       * Ask MetaMask to sign the fresh nonce.
       *
       * Since the nonce should be new each time,
       * this creates a fresh authentication proof.
       */
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [nonce, address],
      });

      /*
       * STEP 3:
       * Send wallet address, nonce and signature
       * to the Auth Service.
       */
      const loginResult = await api.walletLogin(
        address,
        nonce,
        signature
      );

      /*
       * STEP 4:
       * Authentication must return a valid JWT.
       */
      if (!loginResult || !loginResult.token) {
        throw new Error(
          'Authentication failed: No JWT token received.'
        );
      }

      // Store the newly generated token
      localStorage.setItem(
        'evault-token',
        loginResult.token
      );

      // Mark user as authenticated
      setWalletAddress(address);
      setIsConnected(true);

      /*
       * Fetch user role.
       */
      try {
        const role = await api.getUserRole(address);

        applyRoleToUser(
          address,
          role,
          loginResult.role || 'CLIENT'
        );
      } catch (roleError) {
        console.warn(
          'Could not fetch user role. Using login role.',
          roleError
        );

        applyRoleToUser(
          address,
          loginResult.role,
          'CLIENT'
        );
      }

      // Check Aadhaar binding
      checkWalletAadhaarBinding(address);

    } catch (err) {
      /*
       * If the user rejects MetaMask OR authentication fails,
       * make sure the application remains logged out.
       */
      console.warn(
        'MetaMask authentication failed or was cancelled:',
        err
      );

      handleLogout();

      alert(
        'Authentication failed or was cancelled. Please try again.'
      );
    }
  };

  const tabBtn = (id, icon, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all text-xs ${
        activeTab === id
          ? 'bg-paper-rust text-white font-bold'
          : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const role = (
    currentUser?.role || ''
  ).toUpperCase();

  return (
    <div className="min-h-[100dvh] bg-paper-bg text-paper-ink flex flex-col font-body selection:bg-paper-rust selection:text-white">

      <Navbar
        walletAddress={walletAddress}
        isConnected={isConnected}
        onConnectWallet={handleConnectWallet}
        aadhaarStatus={aadhaarStatus}
        onOpenIdentity={() => setActiveTab('aadhaar')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">

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
              'Audit'
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
            <p className="text-[10px] text-paper-muted px-3 pb-1 font-body">
              Signed in as{' '}
              <span className="font-mono text-paper-ink">
                {role}
              </span>
            </p>
          )}

        </div>

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
                onLoginSuccess={(usr) =>
                  setCurrentUser(usr)
                }
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

            <span>
              · Secure Legal Document Vault
            </span>

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