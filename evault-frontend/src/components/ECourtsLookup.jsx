import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlass,
  Buildings,
  User,
  Scales,
  Calendar,
  CaretRight,
  Warning,
  ArrowsClockwise,
  PlusCircle,
  CheckCircle,
  ShieldCheck,
  FileText,
  Lock,
  ArrowRight
} from '@phosphor-icons/react';
import api from '../services/api';
import { StaggerContainer, StaggerItem, FadeIn } from './common/FadeIn';

const CASE_TYPES = [
  'Civil Suit',
  'Criminal Trial',
  'Bail Application',
  'Police FIR / Investigation',
  'Charge Sheet',
  'Commercial Dispute',
  'Writ Petition',
  'Taxation Appeal',
];

export function ECourtsLookup({ currentUser }) {
  const userRole = (currentUser?.role || '').toUpperCase();
  const canCreateCase = userRole === 'LAWYER' || userRole === 'POLICE';
  const isJudge = userRole === 'JUDGE';
  const isClient = userRole === 'CLIENT' || userRole === 'CITIZEN';

  const [searchQuery, setSearchQuery] = useState('');
  const [judgeQuery, setJudgeQuery] = useState('');
  const [lawyerQuery, setLawyerQuery] = useState('');
  const [activeTab, setActiveTab] = useState('case'); // 'case' | 'judge' | 'lawyer' | 'courts' | 'create'
  
  const [caseData, setCaseData] = useState(null);
  const [casesList, setCasesList] = useState([]);
  const [courtsList, setCourtsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New Case Creation Form State (Exclusive to Lawyer & Police)
  const [newCaseId, setNewCaseId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCourt, setNewCourt] = useState('Mumbai High Court');
  const [newJudge, setNewJudge] = useState('Hon. Justice D. Y. Patil');
  const [newCaseType, setNewCaseType] = useState('Civil Suit');
  const [newPetitioner, setNewPetitioner] = useState('');
  const [newRespondent, setNewRespondent] = useState('');
  const [newNextHearing, setNewNextHearing] = useState('2026-09-15');
  const [newFilingDate, setNewFilingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newLawyerBar, setNewLawyerBar] = useState(currentUser?.barNumber || currentUser?.policeId || '');
  const [creating, setCreating] = useState(false);

  const loadRegisteredCases = async () => {
    try {
      const res = await api.listCases();
      if (res?.success && Array.isArray(res.data)) {
        setCasesList(res.data);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadRegisteredCases();
    const interval = setInterval(() => {
      loadRegisteredCases();
      if (caseData?.caseId) {
        api.getCaseById(caseData.caseId).then((r) => {
          if (r?.success && r?.data) {
            setCaseData((prev) => (prev?.caseId === r.data.caseId ? { ...prev, ...r.data } : prev));
          }
        }).catch(() => {});
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [caseData?.caseId]);

  const handleSearchCase = async (idToSearch) => {
    const caseId = (idToSearch || searchQuery).trim().toUpperCase();
    if (!caseId) {
      setError("Please enter a Case ID to search.");
      return;
    }
    
    if (!/^CASE-[A-Z]{2}-\d{3,}$/.test(caseId)) {
      setError("Invalid Case ID format. Must follow 'CASE-XX-###' (e.g. CASE-MH-101, CASE-DL-202), where XX is the 2-letter State code.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCaseById(caseId);
      if (response.success && response.data) {
        setCaseData(response.data);
      } else {
        setError(response.error || "Case record not found.");
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Case query error.";
      setCaseData(null);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchJudge = async () => {
    const q = judgeQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCasesByJudge(q);
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        setCasesList(response.data);
      } else {
        // Fallback search across listCases
        const allRes = await api.listCases();
        const matches = (allRes.data || []).filter((c) =>
          (c.judge || '').toLowerCase().includes(q.toLowerCase())
        );
        if (matches.length > 0) {
          setCasesList(matches);
        } else {
          setError(`No cases found for judge: "${q}".`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Judge query error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLawyer = async () => {
    const q = lawyerQuery.trim().toUpperCase();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCasesByLawyer(q);
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        setCasesList(response.data);
      } else {
        const allRes = await api.listCases();
        const matches = (allRes.data || []).filter((c) =>
          (c.lawyerBar || '').toUpperCase().includes(q) || (c.barNumber || '').toUpperCase().includes(q)
        );
        if (matches.length > 0) {
          setCasesList(matches);
        } else {
          setError(`No cases found for Bar / Badge Reg: "${q}".`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Lawyer query error.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadCourts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCourts();
      if (response.success) {
        setCourtsList(response.data);
      } else {
        setError(response.error || "Failed to load courts.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Courts query error.");
    } finally {
      setLoading(false);
    }
  };

  // Case Registration Handler (Exclusive to Lawyer and Police)
  const handleCreateCaseSubmit = async (e) => {
    e.preventDefault();
    if (!canCreateCase) {
      setError('Unauthorized: Only Advocates (Lawyer) and Police Law Enforcement can register/create new cases.');
      return;
    }

    const cleanCaseId = newCaseId.trim().toUpperCase();
    if (!/^CASE-[A-Z]{2}-\d{3,}$/.test(cleanCaseId)) {
      setError("Invalid Case ID format. Must follow 'CASE-XX-###' (e.g. CASE-MH-102, CASE-DL-201), where XX is the 2-letter State code.");
      return;
    }

    if (!newTitle.trim()) {
      setError('Please provide the Case Title / Matter Description.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccessMsg(null);

    const casePayload = {
      caseId: cleanCaseId,
      title: newTitle.trim(),
      court: newCourt.trim(),
      judge: newJudge.trim(),
      filingDate: newFilingDate,
      status: 'ACTIVE',
      petitioner: newPetitioner.trim() || 'Petitioner Party',
      respondent: newRespondent.trim() || 'Respondent Party',
      nextHearing: newNextHearing,
      caseType: newCaseType,
      lawyerBar: newLawyerBar.trim() || currentUser?.barNumber || currentUser?.policeId || 'MAH-10492-2020',
      createdBy: currentUser?.name || (userRole === 'POLICE' ? 'Police Inspector' : 'Advocate'),
    };

    try {
      const result = await api.createCase(casePayload);
      
      // Log audit event for case creation
      await api.logAuditEvent({
        action: 'CASE_REGISTERED_ON_ECOURTS',
        service: 'Integration',
        performedBy: currentUser?.walletAddress || '0xDemoWallet',
        role: userRole,
        userName: currentUser?.name || 'Authorized Official',
        caseId: cleanCaseId,
        details: `${userRole === 'POLICE' ? 'Police Officer' : 'Advocate'} ${currentUser?.name || ''} registered new case ${cleanCaseId} (${newTitle.trim()}) in eCourts registry.`,
      }).catch(console.warn);

      setSuccessMsg(`Case ${cleanCaseId} successfully registered in National eCourts registry.`);
      setCaseData(result.data || casePayload);
      setSearchQuery(cleanCaseId);
      
      // Reset creation form
      setNewCaseId('');
      setNewTitle('');
      setNewPetitioner('');
      setNewRespondent('');

      setTimeout(() => {
        setActiveTab('case');
        setSuccessMsg(null);
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create case record.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'ACTIVE').toUpperCase();
    if (s === 'CLOSED' || s === 'DISPOSED' || s.includes('CLOSED')) {
      return <span className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/40 px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider">CLOSED</span>;
    }
    if (s === 'HEARING') {
      return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">HEARING</span>;
    }
    if (s === 'RESERVED') {
      return <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">RESERVED</span>;
    }
    return <span className="bg-paper-surface text-paper-rust border border-paper-rust/40 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">{s}</span>;
  };

  // If Client somehow reaches this tab, show strict access restriction notice
  if (isClient) {
    return (
      <div className="max-w-2xl mx-auto bg-paper-card border border-paper-border p-8 rounded-sm text-center space-y-4 font-mono text-xs">
        <Lock size={36} className="text-paper-rust mx-auto" />
        <h3 className="font-heading text-lg font-bold text-paper-ink">Role Access Restricted</h3>
        <p className="text-paper-muted">
          Client accounts are restricted exclusively to <strong>Document Upload</strong>, <strong>My Vault</strong>, and <strong>Audit Trail</strong>. Direct national case browsing is reserved for judicial officers, advocates, and police.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body">
      
      {/* Header & Search Interface */}
      <div className="bg-paper-card border border-paper-border p-8 shadow-sm rounded-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-border pb-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">
              Indian Case Records & Filing Registry
            </h2>
          </div>

          {casesList.length > 0 && (
            <div className="flex items-center space-x-2 font-mono text-xs overflow-x-auto">
              <span className="text-paper-muted text-[10px] font-bold uppercase">REGISTERED CASES ({casesList.length}):</span>
              {casesList.slice(0, 4).map((item) => (
                <button
                  key={item.caseId}
                  onClick={() => {
                    setSearchQuery(item.caseId);
                    setCaseData(item);
                    setActiveTab('case');
                  }}
                  className="bg-paper-surface hover:bg-paper-border text-paper-ink border border-paper-border px-2.5 py-1 transition rounded-sm text-[11px]"
                >
                  {item.caseId}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation / Action Subtabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-paper-border pb-3">
          <button
            onClick={() => setActiveTab('case')}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs transition flex items-center space-x-1.5 ${
              activeTab === 'case' ? 'bg-paper-rust text-white font-bold' : 'bg-paper-surface hover:bg-paper-border text-paper-ink'
            }`}
          >
            <Scales size={15} weight="bold" />
            <span>CASE LOOKUP</span>
          </button>
          <button
            onClick={() => setActiveTab('judge')}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs transition flex items-center space-x-1.5 ${
              activeTab === 'judge' ? 'bg-paper-rust text-white font-bold' : 'bg-paper-surface hover:bg-paper-border text-paper-ink'
            }`}
          >
            <User size={15} weight="bold" />
            <span>JUDGE SEARCH</span>
          </button>
          <button
            onClick={() => setActiveTab('lawyer')}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs transition flex items-center space-x-1.5 ${
              activeTab === 'lawyer' ? 'bg-paper-rust text-white font-bold' : 'bg-paper-surface hover:bg-paper-border text-paper-ink'
            }`}
          >
            <Buildings size={15} weight="bold" />
            <span>BAR / POLICE SEARCH</span>
          </button>
          <button
            onClick={() => { setActiveTab('courts'); handleLoadCourts(); }}
            className={`px-3 py-1.5 rounded-sm font-mono text-xs transition flex items-center space-x-1.5 ${
              activeTab === 'courts' ? 'bg-paper-rust text-white font-bold' : 'bg-paper-surface hover:bg-paper-border text-paper-ink'
            }`}
          >
            <Buildings size={15} weight="bold" />
            <span>COURTS DIRECTORY</span>
          </button>

          {/* LAWYER & POLICE: Create Case Action Button */}
          {canCreateCase && (
            <button
              onClick={() => {
                setActiveTab('create');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`ml-auto px-3.5 py-1.5 rounded-sm font-mono text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'create'
                  ? 'bg-paper-rust text-white shadow-offset-sm'
                  : 'bg-paper-rust/10 text-paper-rust border border-paper-rust/30 hover:bg-paper-rust hover:text-white'
              }`}
            >
              <PlusCircle size={15} weight="bold" />
              <span>+ CREATE NEW CASE</span>
            </button>
          )}

          {/* If Judge, indicate why case creation is not present */}
          {isJudge && (
            <span
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-mono text-paper-muted bg-paper-surface border border-paper-border px-2.5 py-1 rounded-sm"
              title="Judicial officers preside over case dockets and do not file or create cases."
            >
              <Lock size={12} />
              <span>Case Creation: Advocates & Police Only</span>
            </span>
          )}
        </div>

        {/* Inputs */}
        <div className="font-mono text-xs">
          {activeTab === 'case' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass size={16} className="text-paper-muted absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  placeholder="Enter Case ID (e.g. CASE-MH-101)..."
                  className="w-full bg-paper-bg border border-paper-border rounded-sm pl-9 pr-3 py-2 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink"
                />
              </div>
              <button
                onClick={() => handleSearchCase()}
                disabled={loading}
                className="btn-editorial-rust font-mono flex items-center space-x-1.5"
              >
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <MagnifyingGlass size={16} weight="bold" />}
                <span>FETCH CASE</span>
              </button>
            </div>
          )}

          {activeTab === 'judge' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={judgeQuery}
                onChange={(e) => setJudgeQuery(e.target.value)}
                placeholder="Enter Judge Name (e.g. Hon. Justice R.K. Sharma or Patil)..."
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button
                onClick={handleSearchJudge}
                disabled={loading}
                className="btn-editorial-rust font-mono"
              >
                SEARCH JUDGE
              </button>
            </div>
          )}

          {activeTab === 'lawyer' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={lawyerQuery}
                onChange={(e) => setLawyerQuery(e.target.value)}
                placeholder="Enter Bar Reg No or Police Badge (e.g. MAH-10492-2020)..."
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button
                onClick={handleSearchLawyer}
                disabled={loading}
                className="btn-editorial-rust font-mono"
              >
                SEARCH ADVOCATE / POLICE
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 rounded-sm flex items-center space-x-2 text-red-800 text-xs font-mono">
            <Warning size={16} weight="bold" className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-sm flex items-center space-x-2 text-emerald-800 text-xs font-mono">
            <CheckCircle size={16} weight="bold" className="flex-shrink-0 text-emerald-700" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EXCLUSIVE CASE CREATION VIEW (Only for Lawyer & Police) */}
      {/* ========================================================================= */}
      {activeTab === 'create' && canCreateCase && (
        <div className="bg-paper-card border border-paper-border p-8 shadow-sm rounded-xl space-y-8">
          <div className="border-b border-paper-border pb-3">
            <h3 className="font-heading text-lg font-bold text-paper-ink mt-0.5">
              Register New Case
            </h3>
          </div>

          <form onSubmit={handleCreateCaseSubmit} className="space-y-4 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Case ID */}
              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  1. CASE ID * (Format: CASE-XX-###)
                </label>
                <input
                  type="text"
                  required
                  value={newCaseId}
                  onChange={(e) => setNewCaseId(e.target.value.toUpperCase())}
                  placeholder="e.g. CASE-MH-502"
                  className={`w-full bg-paper-bg border rounded-sm p-2.5 text-xs text-paper-ink font-mono focus:outline-none transition ${
                    newCaseId
                      ? /^CASE-[A-Z]{2}-\d{3,}$/.test(newCaseId.trim().toUpperCase())
                        ? 'border-emerald-500 focus:border-emerald-600'
                        : 'border-amber-500 focus:border-amber-600'
                      : 'border-paper-border focus:border-paper-ink'
                  }`}
                />
              </div>

              {/* Case Type */}
              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  2. CASE CATEGORY *
                </label>
                <select
                  value={newCaseType}
                  onChange={(e) => setNewCaseType(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                >
                  {CASE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Court Jurisdiction */}
              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  3. JURISDICTION COURT *
                </label>
                <select
                  value={newCourt}
                  onChange={(e) => setNewCourt(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                >
                  <option value="Mumbai High Court">Mumbai High Court</option>
                  <option value="Delhi High Court">Delhi High Court</option>
                  <option value="Karnataka High Court">Karnataka High Court</option>
                  <option value="Supreme Court of India">Supreme Court of India</option>
                  <option value="Madras High Court">Madras High Court</option>
                  <option value="District Court Patna">District Court Patna</option>
                  <option value="District Court Bengaluru">District Court Bengaluru</option>
                </select>
              </div>
            </div>

            {/* Matter Title */}
            <div>
              <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                4. CASE TITLE / MATTER DESCRIPTION *
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. State of Maharashtra vs. R. K. Sharma (or Petitioner vs. Respondent)"
                className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
            </div>

            {/* Parties */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  5. PETITIONER / COMPLAINANT *
                </label>
                <input
                  type="text"
                  required
                  value={newPetitioner}
                  onChange={(e) => setNewPetitioner(e.target.value)}
                  placeholder="e.g. Anand Mahindra / State of Maharashtra"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  6. RESPONDENT / ACCUSED *
                </label>
                <input
                  type="text"
                  required
                  value={newRespondent}
                  onChange={(e) => setNewRespondent(e.target.value)}
                  placeholder="e.g. Union of India / Ramesh Kumar"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>
            </div>

            {/* Judge & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  7. ASSIGNED BENCH JUDGE
                </label>
                <input
                  type="text"
                  value={newJudge}
                  onChange={(e) => setNewJudge(e.target.value)}
                  placeholder="e.g. Hon. Justice D. Y. Patil"
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  8. FILING DATE
                </label>
                <input
                  type="date"
                  value={newFilingDate}
                  onChange={(e) => setNewFilingDate(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                  9. NEXT HEARING DATE
                </label>
                <input
                  type="date"
                  value={newNextHearing}
                  onChange={(e) => setNewNextHearing(e.target.value)}
                  className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>
            </div>

            {/* Advocate / Police Bar Number */}
            <div>
              <label className="block text-[10px] text-paper-muted uppercase font-bold mb-1">
                10. FILING OFFICIAL BAR REGISTRATION / BADGE ID *
              </label>
              <input
                type="text"
                required
                value={newLawyerBar}
                onChange={(e) => setNewLawyerBar(e.target.value)}
                placeholder="e.g. MAH-10492-2020 or MH-POL-8492"
                className="w-full bg-paper-bg border border-paper-border rounded-sm p-2.5 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="btn-editorial-rust font-heading w-full py-3 text-xs font-bold shadow-offset-sm flex items-center justify-center space-x-2 mt-4"
            >
              {creating ? (
                <ArrowsClockwise size={18} className="animate-spin" />
              ) : (
                <PlusCircle size={18} weight="bold" />
              )}
              <span>{creating ? 'REGISTERING CASE IN ECOURTS REGISTRY…' : 'REGISTER & CREATE CASE IN ECOURTS'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Case Details View */}
      {activeTab === 'case' && caseData && (
        <div className="bg-paper-card border border-paper-border p-8 shadow-sm space-y-8 rounded-xl">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-4">
            <div>
              <span className="text-[10px] font-mono text-paper-rust font-bold uppercase">{caseData.caseId}</span>
              <h3 className="font-heading text-lg font-bold text-paper-ink mt-0.5 tracking-tight">{caseData.title}</h3>
            </div>
            <div>{getStatusBadge(caseData.status)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-paper-surface border border-paper-border p-5 rounded-xl">
              <span className="text-[10px] text-paper-muted uppercase font-bold">JURISDICTION COURT</span>
              <p className="text-xs font-bold text-paper-ink mt-1">{caseData.court}</p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">ASSIGNED JUDGE</span>
              <p className="text-xs font-bold text-paper-ink mt-1">{caseData.judge || 'Unassigned'}</p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-5 rounded-xl">
              <span className="text-[10px] text-paper-muted uppercase font-bold">CASE CATEGORY</span>
              <p className="text-xs font-bold text-paper-ink mt-1">{caseData.caseType}</p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-5 rounded-xl">
              <span className="text-[10px] text-paper-muted uppercase font-bold">NEXT HEARING</span>
              <p className="text-xs font-bold text-paper-rust mt-1">{caseData.nextHearing || 'Disposed'}</p>
            </div>
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm">
            <span className="text-[10px] font-mono font-bold text-paper-muted uppercase">PARTIES LISTED</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-mono text-xs">
              <div className="bg-paper-card p-3 rounded-sm border border-paper-border">
                <span className="text-[10px] text-paper-rust font-bold uppercase">Petitioner / Complainant</span>
                <p className="text-xs font-bold text-paper-ink mt-0.5">{caseData.parties?.petitioner || caseData.petitioner || 'Petitioner'}</p>
              </div>
              <div className="bg-paper-card p-3 rounded-sm border border-paper-border">
                <span className="text-[10px] text-paper-muted font-bold uppercase">Respondent / Accused</span>
                <p className="text-xs font-bold text-paper-ink mt-0.5">{caseData.parties?.respondent || caseData.respondent || 'Respondent'}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Cases List for Judge / Bar Search */}
      {(activeTab === 'judge' || activeTab === 'lawyer') && casesList.length > 0 && (
        <div className="space-y-3 font-mono text-xs">
          <span className="text-paper-muted uppercase font-bold">FOUND {casesList.length} RECORD MATCHES</span>
          {casesList.map((c) => (
            <div key={c.caseId} className="bg-paper-card border border-paper-border rounded-xl p-6 flex items-center justify-between shadow-sm hover:border-paper-rust/50 hover:-translate-y-0.5 transition-all duration-200">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-paper-rust">{c.caseId}</span>
                  {getStatusBadge(c.status)}
                </div>
                <h4 className="font-heading text-sm font-bold text-paper-ink mt-1">{c.title}</h4>
                <p className="text-[11px] text-paper-muted">{c.court} · {c.judge || 'Bench'}</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery(c.caseId);
                  setCaseData(c);
                  setActiveTab('case');
                }}
                className="btn-editorial font-mono"
              >
                <span>VIEW RECORD</span>
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Courts Directory */}
      {activeTab === 'courts' && courtsList.length > 0 && (
        <div className="bg-paper-card border border-paper-border rounded-sm p-6 shadow-offset-sm">
          <h3 className="font-heading text-base font-bold text-paper-ink mb-4 uppercase">INDIAN COURTS REGISTRY DIRECTORY</h3>
          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left">
              <thead className="bg-paper-surface text-paper-muted uppercase text-[10px] border-b border-paper-border">
                <tr>
                  <th className="p-3">Court Code</th>
                  <th className="p-3">Court Jurisdiction Name</th>
                  <th className="p-3">State</th>
                  <th className="p-3">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-border text-paper-ink">
                {courtsList.map((crt) => (
                  <tr key={crt.courtId} className="hover:bg-paper-surface">
                    <td className="p-3 text-paper-rust font-bold">{crt.courtId}</td>
                    <td className="p-3 font-semibold">{crt.name}</td>
                    <td className="p-3 text-paper-muted">{crt.state}</td>
                    <td className="p-3">
                      <span className="bg-paper-surface border border-paper-border px-2 py-0.5 rounded-sm text-[10px]">
                        {crt.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default ECourtsLookup;

