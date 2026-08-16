import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ClassifierModule from './components/ClassifierModule';
import ECourtsLookup from './components/ECourtsLookup';
import AadhaarBinding from './components/AadhaarBinding';
import VaultOverview from './components/VaultOverview';
import AuthAndAuditModule from './components/AuthAndAuditModule';
import JudgeDashboard from './components/JudgeDashboard';
import LawyerDashboard from './components/LawyerDashboard';
import ClientDashboard from './components/ClientDashboard';
import api from './services/api';
import { Sparkle, Buildings, Cpu, ShareNetwork, ShieldCheck, User, Gavel, FileText } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { FadeIn } from './components/common/FadeIn';

export function App() {
  const [activeTab, setActiveTab] = useState('classifier');
  const [walletAddress, setWalletAddress] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  const [isConnected, setIsConnected] = useState(true);
  const [aadhaarStatus, setAadhaarStatus] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    name: 'Adv. Ramesh Sharma',
    email: 'lawyer.sharma@evault.in',
    role: 'LAWYER',
    barNumber: 'MAH-10492-2020'
  });

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
      console.warn("Could not verify wallet Aadhaar binding:", e);
    }
  };

  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          checkWalletAadhaarBinding(accounts[0]);
          return;
        }
      } catch (err) {
        console.warn("MetaMask connection cancelled, using demo wallet.");
      }
    }
    
    const demoWallet = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    setWalletAddress(demoWallet);
    setIsConnected(true);
    checkWalletAadhaarBinding(demoWallet);
  };

  return (
    <div className="min-h-[100dvh] bg-paper-bg text-paper-ink flex flex-col font-body selection:bg-paper-rust selection:text-white">
      
      {/* Navbar Header */}
      <Navbar
        walletAddress={walletAddress}
        isConnected={isConnected}
        onConnectWallet={handleConnectWallet}
        aadhaarStatus={aadhaarStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        
        {/* Module & Workspace Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-card border border-paper-border p-1.5 shadow-offset-sm rounded-sm">
          <div className="flex flex-wrap gap-1 font-mono text-xs font-semibold">
            
            {/* Core Modules */}
            <button
              onClick={() => setActiveTab('classifier')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'classifier'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <Sparkle size={15} weight="bold" />
              <span>AI Classifier</span>
            </button>

            <button
              onClick={() => setActiveTab('ecourts')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'ecourts'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <Buildings size={15} weight="bold" />
              <span>eCourts Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('aadhaar')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'aadhaar'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <Cpu size={15} weight="bold" />
              <span>Aadhaar Binding</span>
            </button>

            <button
              onClick={() => setActiveTab('auth')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'auth'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <User size={15} weight="bold" />
              <span>Auth & Audit</span>
            </button>

            {/* Role Workspaces */}
            <button
              onClick={() => setActiveTab('judge-ws')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'judge-ws'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <Gavel size={15} weight="bold" />
              <span>Judge Bench</span>
            </button>

            <button
              onClick={() => setActiveTab('lawyer-ws')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'lawyer-ws'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <FileText size={15} weight="bold" />
              <span>Lawyer Filing</span>
            </button>

            <button
              onClick={() => setActiveTab('client-ws')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-sm transition-all ${
                activeTab === 'client-ws'
                  ? 'bg-paper-rust text-white font-bold'
                  : 'text-paper-muted hover:text-paper-ink hover:bg-paper-surface'
              }`}
            >
              <User size={15} weight="bold" />
              <span>Citizen Vault</span>
            </button>



          </div>

          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-paper-surface rounded-sm border border-paper-border text-[11px] font-mono text-paper-muted">
            <span className="w-2 h-2 rounded-full bg-paper-rust"></span>
            <span>REST Client: localhost:8086</span>
          </div>
        </div>

        {/* Active Tab Component */}
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
                onLoginSuccess={(usr) => setCurrentUser(usr)}
                onLogout={() => setCurrentUser(null)}
              />
            )}
            {activeTab === 'judge-ws' && <JudgeDashboard />}
            {activeTab === 'lawyer-ws' && <LawyerDashboard />}
            {activeTab === 'client-ws' && <ClientDashboard walletAddress={walletAddress} />}

          </motion.div>
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="border-t border-paper-border bg-paper-card py-5 text-xs text-paper-muted font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck size={18} weight="bold" className="text-paper-rust" />
            <span>eVault Legal Microservice Suite · Smart India Hackathon 2026</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Problem Statement: SIH260229</span>
            <span>·</span>
            <span>Ministry of Law & Justice</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
export default App;
