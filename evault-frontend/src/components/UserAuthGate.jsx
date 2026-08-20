import React, { useState } from 'react';
import {
  Lock,
  LockOpen,
  ShieldCheck,
  User,
  Gavel,
  FileText,
  IdentificationCard,
  Key,
  Wallet,
  Warning,
  CheckCircle,
  ArrowsClockwise,
  ArrowRight,
  Fingerprint,
  Copy,
  SignOut,
  Eye,
  EyeSlash,
  UserPlus,
  SignIn
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export function UserAuthGate({
  walletAddress,
  isConnected,
  onConnectWallet,
  onDisconnectWallet,
  onAuthenticateSuccess,
}) {
  // Default is 'login' as requested
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // All registration fields start completely empty
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('LAWYER');
  const [barNumber, setBarNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [policeId, setPoliceId] = useState('');

  // Login specific fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorType, setErrorType] = useState(null); // 'NOT_REGISTERED' | 'ALREADY_REGISTERED' | null
  const [successMsg, setSuccessMsg] = useState(null);
  const [copied, setCopied] = useState(false);

  // Strict Password Validation Rule:
  // - 8 to 16 characters in length
  // - Must contain alphanumeric characters (both letters and numbers)
  // - Must contain at least one special character
  const validatePassword = (pwd) => {
    const hasValidLength = pwd.length >= 8 && pwd.length <= 16;
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd);

    return {
      isValid: hasValidLength && hasLetters && hasNumbers && hasSpecial,
      hasValidLength,
      hasLetters,
      hasNumbers,
      hasAlphanumeric: hasLetters && hasNumbers,
      hasSpecial,
    };
  };

  const pwdRules = validatePassword(password);

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------
  // LOG IN HANDLER (User Credentials Authentication)
  // -------------------------------------------------------------
  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setErrorType(null);
    setSuccessMsg('Verifying credentials…');

    try {
      // Step 1: Check registered accounts registry
      const storedAccountsStr = localStorage.getItem('evault-registered-accounts');
      const accounts = storedAccountsStr ? JSON.parse(storedAccountsStr) : [];
      
      const foundAccount = accounts.find(
        (acc) => acc.email?.toLowerCase() === loginEmail.trim().toLowerCase()
      );

      let user = null;
      let token = null;

      if (foundAccount) {
        if (foundAccount.password && foundAccount.password !== loginPassword) {
          throw new Error('Invalid email or password.');
        }
        user = {
          walletAddress: walletAddress || foundAccount.walletAddress || '0xDemoWallet',
          name: foundAccount.name,
          email: foundAccount.email,
          role: foundAccount.role || 'LAWYER',
          barNumber: foundAccount.barNumber || null,
          courtName: foundAccount.courtName || null,
          policeId: foundAccount.policeId || null,
        };
        token = foundAccount.token || `evault-jwt-session-${Date.now()}`;
      } else {
        // Step 2: Fallback to API login / demo verification
        const res = await api.login({ email: loginEmail, password: loginPassword });
        if (res && res.success) {
          user = {
            walletAddress: walletAddress || '0xDemoWallet',
            name: res.data.user.name,
            email: res.data.user.email,
            role: res.data.user.role || 'LAWYER',
            barNumber: res.data.user.barNumber || null,
            courtName: res.data.user.courtName || null,
          };
          token = res.data.token || `evault-jwt-session-${Date.now()}`;
        } else {
          throw new Error(res?.error || 'Invalid email or password.');
        }
      }

      // Step 3: Save authenticated session
      localStorage.setItem('evault-token', token);
      localStorage.setItem('evault-wallet', walletAddress || user.walletAddress || '0xDemoWallet');
      localStorage.setItem('evault-role', user.role || 'LAWYER');
      localStorage.setItem('evault-name', user.name);
      if (user.email) localStorage.setItem('evault-email', user.email);

      setSuccessMsg('Credentials verified! Unlocking eVault…');
      setTimeout(() => {
        onAuthenticateSuccess({
          walletAddress: walletAddress || user.walletAddress || '0xDemoWallet',
          role: user.role || 'LAWYER',
          name: user.name,
          email: user.email,
          barNumber: user.barNumber,
          courtName: user.courtName,
          token,
        });
      }, 700);

    } catch (err) {
      console.error('Credentials Login Error:', err);
      setError(err.message || 'Failed to authenticate with credentials.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // REGISTRATION HANDLER (1 Wallet = 1 Account)
  // -------------------------------------------------------------
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!walletAddress && isConnected) {
      setError('Wallet connection missing.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your full legal name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your official email address.');
      return;
    }

    if (role === 'LAWYER' && !barNumber.trim()) {
      setError('State Bar Council Enrollment Number is required for Advocates.');
      return;
    }

    if (role === 'JUDGE' && !courtName.trim()) {
      setError('Court Bench / Jurisdiction is required for Judicial Officers.');
      return;
    }

    if (role === 'POLICE' && !policeId.trim()) {
      setError('Police Station / Badge ID is required for Law Enforcement.');
      return;
    }

    // Strict Password Validation
    if (!pwdRules.isValid) {
      if (!pwdRules.hasValidLength) {
        setError('Password must be between 8 and 16 characters long.');
      } else if (!pwdRules.hasAlphanumeric) {
        setError('Password must contain alphanumeric characters (both letters and numbers).');
      } else if (!pwdRules.hasSpecial) {
        setError('Password must contain at least one special character (e.g. !@#$%^&*).');
      } else {
        setError('Password must be 8-16 characters long, alphanumeric, and contain at least one special character.');
      }
      return;
    }

    setLoading(true);
    setError(null);
    setErrorType(null);
    setSuccessMsg('Registering your legal profile for this Ethereum wallet…');

    try {
      // Step 1: Register wallet with Auth Service if available
      try {
        await api.registerWallet({
          walletAddress: walletAddress || '0xDemoWallet0000000000000000000000000000',
          name: name.trim(),
          email: email.trim(),
          role,
          barNumber: role === 'LAWYER' ? barNumber.trim() : undefined,
          courtId: role === 'JUDGE' ? courtName.trim() : undefined,
        });
      } catch (regErr) {
        const regMsg = regErr.response?.data?.message || regErr.response?.data?.error || regErr.message || '';
        if (regMsg.toLowerCase().includes('already exists') || regMsg.toLowerCase().includes('duplicate')) {
          setErrorType('ALREADY_REGISTERED');
          throw new Error('This Ethereum wallet or email is already registered to an existing account. Please log in instead.');
        }
        console.warn('Backend registration note:', regMsg);
      }

      // Step 2: Save to registered accounts registry
      const storedAccountsStr = localStorage.getItem('evault-registered-accounts');
      const accounts = storedAccountsStr ? JSON.parse(storedAccountsStr) : [];
      
      const token = 'evault-jwt-session-' + Date.now();
      const newAccount = {
        walletAddress: walletAddress || '0xDemoWallet',
        name: name.trim(),
        email: email.trim(),
        password: password,
        role,
        barNumber: role === 'LAWYER' ? barNumber.trim() : null,
        courtName: role === 'JUDGE' ? courtName.trim() : null,
        policeId: role === 'POLICE' ? policeId.trim() : null,
        token,
        registeredAt: new Date().toISOString(),
      };

      const updatedAccounts = accounts.filter(
        (a) => a.email?.toLowerCase() !== email.trim().toLowerCase() && a.walletAddress?.toLowerCase() !== (walletAddress || '').toLowerCase()
      );
      updatedAccounts.push(newAccount);
      localStorage.setItem('evault-registered-accounts', JSON.stringify(updatedAccounts));

      localStorage.setItem('evault-token', token);
      localStorage.setItem('evault-wallet', walletAddress || '0xDemoWallet');
      localStorage.setItem('evault-role', role);
      localStorage.setItem('evault-name', name.trim());
      setSuccessMsg('Account registered successfully! Unlocking your legal workspace…');

      api.logAuditEvent({
        action: 'USER_REGISTERED',
        service: 'Auth',
        performedBy: walletAddress || '0xDemoWallet',
        role,
        userName: name.trim(),
        details: `New ${role} profile registered for ${name.trim()} (${email.trim()}). Bound Wallet: ${walletAddress || '0xDemoWallet'}`,
      }).catch(console.warn);

      setTimeout(() => {
        onAuthenticateSuccess({
          walletAddress: walletAddress || '0xDemoWallet',
          role,
          name: name.trim(),
          email: email.trim(),
          barNumber: role === 'LAWYER' ? barNumber.trim() : null,
          courtName: role === 'JUDGE' ? courtName.trim() : null,
          token,
        });
      }, 700);

    } catch (err) {
      console.error('Registration Error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto font-body">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-xl bg-paper-card border-2 border-paper-border-dark shadow-2xl rounded-sm overflow-hidden my-auto"
      >
        {/* Top Security Banner */}
        <div className="bg-paper-surface border-b border-paper-border px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 border border-paper-border-dark bg-paper-card flex items-center justify-center rounded-sm text-paper-rust shadow-offset-sm">
              <Lock size={22} weight="bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">
                  SYSTEM LOCKED // AUTHENTICATION GATEWAY
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  MANDATORY
                </span>
              </div>
              <h1 className="font-heading text-lg font-bold text-paper-ink tracking-tight">
                {authMode === 'login' ? 'Log In to eVault' : 'Register New Legal Account'}
              </h1>
            </div>
          </div>

          {isConnected && walletAddress && (
            <button
              type="button"
              onClick={onDisconnectWallet}
              className="flex items-center space-x-1 text-[11px] font-mono text-paper-muted hover:text-paper-rust transition border border-paper-border hover:border-paper-rust px-2.5 py-1 rounded-sm bg-paper-card"
              title="Disconnect Wallet"
            >
              <SignOut size={14} weight="bold" />
              <span>DISCONNECT</span>
            </button>
          )}
        </div>

        {/* Connected Wallet Status Bar */}
        <div className="bg-paper-bg px-6 py-3 border-b border-paper-border flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-paper-muted text-[11px]">ETHEREUM WALLET:</span>
            <span className="text-paper-ink font-bold font-mono">
              {walletAddress ? `${walletAddress.substring(0, 10)}…${walletAddress.substring(walletAddress.length - 8)}` : 'No wallet connected'}
            </span>
            {walletAddress && (
              <button
                type="button"
                onClick={copyAddress}
                className="text-paper-muted hover:text-paper-ink transition p-1"
                title="Copy Address"
              >
                <Copy size={13} weight="bold" />
              </button>
            )}
            {copied && <span className="text-[10px] text-emerald-600 font-sans font-bold">COPIED</span>}
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] text-paper-muted">
            <ShieldCheck size={14} weight="bold" className="text-paper-rust" />
            <span>1 Wallet = 1 Account</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 space-y-5">
          {!isConnected ? (
            /* Prompt to Connect Wallet First */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-paper-surface border border-paper-border flex items-center justify-center text-paper-rust shadow-offset-sm">
                <Wallet size={32} weight="bold" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-paper-ink">
                  Connect MetaMask Wallet
                </h3>
                <p className="text-xs text-paper-muted max-w-md mx-auto">
                  To enter the eVault system, please connect your Ethereum wallet. You will then be able to log in with your credentials or register a new legal account.
                </p>
              </div>
              <button
                type="button"
                onClick={onConnectWallet}
                className="btn-editorial-rust font-heading mx-auto px-6 py-2.5 text-xs font-bold"
              >
                <Wallet size={18} weight="bold" />
                <span>CONNECT METAMASK WALLET</span>
              </button>
            </div>
          ) : (
            <div>
              {/* ========================================================================= */}
              {/* VIEW 1: LOG IN WITH USER CREDENTIALS (SOLE LOGIN METHOD) */}
              {/* ========================================================================= */}
              {authMode === 'login' ? (
                <div className="space-y-4">
                  <div className="border border-paper-border bg-paper-card p-5 rounded-sm space-y-4">
                    <div className="space-y-1 border-b border-paper-border pb-3">
                      <div className="flex items-center space-x-2 text-paper-ink font-heading font-bold text-sm">
                        <Key size={18} weight="bold" className="text-paper-rust" />
                        <span>User Credentials Authentication</span>
                      </div>
                      <p className="text-xs text-paper-muted font-body leading-relaxed">
                        Enter your registered email and password to authenticate access for connected wallet <code className="text-paper-ink font-mono font-bold">{walletAddress ? `${walletAddress.substring(0, 8)}…${walletAddress.substring(walletAddress.length - 6)}` : 'wallet'}</code>.
                      </p>
                    </div>

                    <form onSubmit={handleCredentialsLogin} className="space-y-3.5 font-mono text-xs">
                      <div>
                        <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                          REGISTERED EMAIL *
                        </label>
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="name@evault.in…"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink transition"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] text-paper-muted uppercase font-bold">
                            PASSWORD *
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="text-[10px] text-paper-muted hover:text-paper-ink flex items-center space-x-1"
                          >
                            {showLoginPassword ? <EyeSlash size={12} /> : <Eye size={12} />}
                            <span>{showLoginPassword ? 'Hide' : 'Show'}</span>
                          </button>
                        </div>
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink transition"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-editorial-rust font-heading w-full py-3 text-xs font-bold shadow-offset-sm flex items-center justify-center space-x-2 mt-2"
                      >
                        {loading ? (
                          <ArrowsClockwise size={18} className="animate-spin" />
                        ) : (
                          <SignIn size={18} weight="bold" />
                        )}
                        <span>
                          {loading ? 'VERIFYING CREDENTIALS…' : 'LOG IN WITH CREDENTIALS'}
                        </span>
                      </button>
                    </form>
                  </div>

                  {/* Switch to Register Banner */}
                  <div className="pt-3 border-t border-paper-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-body bg-paper-surface/50 p-3.5 rounded-sm">
                    <span className="text-paper-muted">
                      Don't have an account?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setError(null);
                        setErrorType(null);
                        setSuccessMsg(null);
                      }}
                      className="font-heading font-bold text-paper-rust hover:text-paper-rust-hover transition flex items-center space-x-1.5 underline underline-offset-2"
                    >
                      <UserPlus size={16} weight="bold" />
                      <span>Please register here →</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* VIEW 2: REGISTER NEW ACCOUNT (1 Wallet = 1 Account) */
                /* ========================================================================= */
                <div className="space-y-4">
                  <div className="bg-paper-surface border border-paper-border p-3 rounded-sm flex items-center space-x-2 text-xs text-paper-muted">
                    <ShieldCheck size={16} weight="bold" className="text-paper-rust flex-shrink-0" />
                    <span>
                      Creating a new legal profile for wallet <strong className="text-paper-ink font-mono">{walletAddress?.substring(0, 8)}…</strong>. One account permitted per wallet.
                    </span>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3.5 font-mono text-xs">
                    {/* Role Selector Grid */}
                    <div>
                      <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1.5">
                        1. SELECT ACCOUNT ROLE *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'LAWYER', label: 'Advocate', icon: <FileText size={15} weight="bold" />, desc: 'Case Creation & Filing' },
                          { id: 'POLICE', label: 'Police Officer', icon: <ShieldCheck size={15} weight="bold" />, desc: 'Case & FIR Creation' },
                          { id: 'JUDGE', label: 'Judicial Officer', icon: <Gavel size={15} weight="bold" />, desc: 'Orders & Bench (No Case Creation)' },
                          { id: 'CITIZEN', label: 'Citizen / Client', icon: <User size={15} weight="bold" />, desc: 'Upload, MyVault & Audit' },
                        ].map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRole(r.id)}
                            className={`p-2 rounded-sm border text-left flex flex-col justify-between transition-all ${
                              role === r.id
                                ? 'border-paper-border-dark bg-paper-rust text-white shadow-offset-sm'
                                : 'border-paper-border bg-paper-surface text-paper-ink hover:border-paper-ink'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              {r.icon}
                              {role === r.id && <CheckCircle size={13} weight="fill" />}
                            </div>
                            <div className="mt-1.5">
                              <span className="font-heading font-bold text-xs block leading-tight">{r.label}</span>
                              <span className={`text-[9px] block ${role === r.id ? 'text-white/80' : 'text-paper-muted'}`}>{r.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Profile Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                          FULL LEGAL NAME *
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Adv. Ramesh Sharma…"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                          OFFICIAL EMAIL ADDRESS *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@domain.in…"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                        />
                      </div>
                    </div>

                    {/* Role Specific Fields */}
                    {role === 'LAWYER' && (
                      <div>
                        <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                          STATE BAR COUNCIL ENROLLMENT NUMBER *
                        </label>
                        <input
                          type="text"
                          required
                          value={barNumber}
                          onChange={(e) => setBarNumber(e.target.value)}
                          placeholder="e.g. MAH-10492-2020"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                        />
                      </div>
                    )}

                    {role === 'JUDGE' && (
                      <div>
                        <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                          COURT BENCH / JURISDICTION *
                        </label>
                        <input
                          type="text"
                          required
                          value={courtName}
                          onChange={(e) => setCourtName(e.target.value)}
                          placeholder="e.g. High Court of Judicature at Bombay"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                        />
                      </div>
                    )}

                    {role === 'POLICE' && (
                      <div>
                        <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                          POLICE STATION / FORENSIC BADGE ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={policeId}
                          onChange={(e) => setPoliceId(e.target.value)}
                          placeholder="e.g. MH-POL-8492"
                          className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                        />
                      </div>
                    )}

                    {/* Password Input with Strict Validation */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-paper-muted uppercase font-bold">
                          SECURITY PASSWORD * (8–16 CHARS, ALPHANUMERIC + SPECIAL CHAR)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-paper-muted hover:text-paper-ink flex items-center space-x-1"
                        >
                          {showPassword ? <EyeSlash size={12} /> : <Eye size={12} />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={16}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter 8–16 char password…"
                        className={`w-full bg-paper-bg border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none transition ${
                          password
                            ? pwdRules.isValid
                              ? 'border-emerald-500 focus:border-emerald-600'
                              : 'border-amber-500 focus:border-amber-600'
                            : 'border-paper-border focus:border-paper-ink'
                        }`}
                      />

                      {/* Password Requirements Checklist */}
                      <div className="mt-2 p-2 bg-paper-surface border border-paper-border rounded-sm grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
                        <div className={`flex items-center space-x-1 ${password ? (pwdRules.hasValidLength ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-700 dark:text-amber-400') : 'text-paper-muted'}`}>
                          {password && pwdRules.hasValidLength ? (
                            <CheckCircle size={13} weight="fill" className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-paper-border-dark flex-shrink-0" />
                          )}
                          <span>8–16 chars</span>
                        </div>

                        <div className={`flex items-center space-x-1 ${password ? (pwdRules.hasAlphanumeric ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-700 dark:text-amber-400') : 'text-paper-muted'}`}>
                          {password && pwdRules.hasAlphanumeric ? (
                            <CheckCircle size={13} weight="fill" className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-paper-border-dark flex-shrink-0" />
                          )}
                          <span>Letters & Numbers</span>
                        </div>

                        <div className={`flex items-center space-x-1 ${password ? (pwdRules.hasSpecial ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-amber-700 dark:text-amber-400') : 'text-paper-muted'}`}>
                          {password && pwdRules.hasSpecial ? (
                            <CheckCircle size={13} weight="fill" className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-paper-border-dark flex-shrink-0" />
                          )}
                          <span>≥ 1 Special char</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-editorial-rust font-heading w-full py-3 text-xs font-bold mt-2"
                    >
                      {loading ? (
                        <ArrowsClockwise size={18} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={18} weight="bold" />
                      )}
                      <span>
                        {loading ? 'REGISTERING & VERIFYING…' : `REGISTER AS ${role} & UNLOCK EVAULT`}
                      </span>
                    </button>
                  </form>

                  {/* Switch back to Login Banner */}
                  <div className="pt-3 border-t border-paper-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-body bg-paper-surface/50 p-3 rounded-sm">
                    <span className="text-paper-muted">
                      Already have an account registered with this wallet?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setError(null);
                        setErrorType(null);
                        setSuccessMsg(null);
                      }}
                      className="font-heading font-bold text-paper-rust hover:text-paper-rust-hover transition flex items-center space-x-1.5 underline underline-offset-2"
                    >
                      <SignIn size={16} weight="bold" />
                      <span>Log in here →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm space-y-2 text-red-600 text-xs font-mono"
            >
              <div className="flex items-center space-x-2">
                <Warning size={16} weight="bold" className="flex-shrink-0" />
                <span>{error}</span>
              </div>

              {errorType === 'NOT_REGISTERED' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                    setErrorType(null);
                  }}
                  className="bg-paper-card border border-red-500 text-red-700 dark:text-red-300 hover:bg-red-500 hover:text-white px-3 py-1 text-[11px] font-bold rounded-sm transition flex items-center space-x-1 mt-1"
                >
                  <UserPlus size={13} weight="bold" />
                  <span>REGISTER THIS WALLET NOW</span>
                </button>
              )}

              {errorType === 'ALREADY_REGISTERED' && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                    setErrorType(null);
                  }}
                  className="bg-paper-card border border-red-500 text-red-700 dark:text-red-300 hover:bg-red-500 hover:text-white px-3 py-1 text-[11px] font-bold rounded-sm transition flex items-center space-x-1 mt-1"
                >
                  <SignIn size={13} weight="bold" />
                  <span>GO TO LOGIN</span>
                </button>
              )}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-sm flex items-center space-x-2 text-emerald-600 text-xs font-mono"
            >
              <CheckCircle size={16} weight="bold" className="flex-shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-paper-surface border-t border-paper-border px-6 py-3 flex items-center justify-between text-[10px] text-paper-muted font-mono">
          <span>AES-256-GCM Vault Security</span>
          <span>Zero Knowledge Access Gateway</span>
        </div>
      </motion.div>
    </div>
  );
}

export default UserAuthGate;
