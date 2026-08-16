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
import { Sparkle, Buildings, Cpu, ShieldCheck, User, Gavel, FileText } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';

const DEMO_WALLET = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export function App() {
  const [activeTab, setActiveTab] = useState('classifier');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [aadhaarStatus, setAadhaarStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

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
      console.warn('Could not verify wallet Aadhaar binding:', e);
    }
  };

  const applyRoleToUser = (address, role, fallbackRole = 'CLIENT') => {
    const resolved = typeof role === 'string' && role ? role : fallbackRole;
    setCurrentUser({
      walletAddress: address,
      role: resolved,
      name: `${address.substring(0, 10)}...`,
    });
  };

  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const address = accounts[0];

          try {
            const nonce = await api.getNonce(address);
            const signature = await window.ethereum.request({
              method: 'personal_sign',
              params: [nonce, address],
            });

            const loginResult = await api.walletLogin(address, nonce, signature);
            localStorage.setItem('evault-token', loginResult.token);

            setWalletAddress(address);
            setIsConnected(true);

            try {
              const role = await api.getUserRole(address);
              applyRoleToUser(address, role, loginResult.role || 'CLIENT');
            } catch {
              applyRoleToUser(address, loginResult.role, 'CLIENT');
            }

            checkWalletAadhaarBinding(address);
            return;
          } catch (authErr) {
            console.warn('JWT auth failed, wallet not registered or backend offline:', authErr);
            setWalletAddress(address);
            setIsConnected(true);
            applyRoleToUser(address, null, 'CLIENT');
            checkWalletAadhaarBinding(address);
            return;
          }
        }
      } catch (err) {
        console.warn('MetaMask connection cancelled, using demo wallet.');
      }
    }

    setWalletAddress(DEMO_WALLET);
    setIsConnected(true);
    applyRoleToUser(DEMO_WALLET, 'LAWYER');
    checkWalletAadhaarBinding(DEMO_WALLET);
  };

  const tabBtn = (id, icon, label) => (
    <button
      key={id}
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
        activeTab === id
          ? 'bg-paper-rust text-white font-bold'
          : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-[100dvh] bg-paper-bg text-paper-ink flex flex-col font-body selection:bg-paper-rust selection:text-white">
      <Navbar
        walletAddress={walletAddress}
        isConnected={isConnected}
        onConnectWallet={handleConnectWallet}
        aadhaarStatus={aadhaarStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-card border border-paper-border p-1.5 shadow-offset-sm rounded-sm">
          <div className="flex flex-wrap gap-1 font-mono text-xs font-semibold">
            {tabBtn('classifier', <Sparkle size={15} weight="bold" />, 'AI Classifier')}
            {tabBtn('ecourts', <Buildings size={15} weight="bold" />, 'eCourts Portal')}
            {tabBtn('aadhaar', <Cpu size={15} weight="bold" />, 'Aadhaar Binding')}
            {tabBtn('auth', <User size={15} weight="bold" />, 'Auth & Audit')}
            {tabBtn('judge-ws', <Gavel size={15} weight="bold" />, 'Judge Bench')}
            {tabBtn('lawyer-ws', <FileText size={15} weight="bold" />, 'Lawyer Filing')}
            {tabBtn('client-ws', <User size={15} weight="bold" />, 'Citizen Vault')}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'classifier' && <ClassifierModule />}
            {activeTab === 'ecourts' && <ECourtsLookup />}
            {activeTab === 'aadhaar' && (
              <AadhaarBinding
                walletAddress={walletAddress}
                isConnected={isConnected}
                onBindingSuccess={() => checkWalletAadhaarBinding(walletAddress)}
              />
            )}
            {activeTab === 'auth' && (
              <AuthAndAuditModule
                currentUser={currentUser}
                walletAddress={walletAddress}
                onLoginSuccess={(usr) => setCurrentUser(usr)}
                onLogout={() => {
                  setCurrentUser(null);
                  localStorage.removeItem('evault-token');
                }}
              />
            )}
            {activeTab === 'judge-ws' && <JudgeDashboard />}
            {activeTab === 'lawyer-ws' && <LawyerDashboard currentUser={currentUser} />}
            {activeTab === 'client-ws' && <ClientDashboard walletAddress={walletAddress} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-paper-border bg-paper-card py-5 text-xs text-paper-muted font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck size={18} weight="bold" className="text-paper-rust" />
            <span>eVault · Secure Legal Document Vault</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Encrypted storage · Blockchain integrity · Role-based access</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
