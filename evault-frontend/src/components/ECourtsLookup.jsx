import React, { useState, useEffect } from 'react';
import { MagnifyingGlass, Buildings, User, Scales, Calendar, CaretRight, Warning, ArrowsClockwise } from '@phosphor-icons/react';
import api from '../services/api';

const QUICK_CASES = [
  { id: 'CASE-MH-2024-001', court: 'Mumbai High Court' },
  { id: 'CASE-DL-2024-001', court: 'Delhi High Court' },
  { id: 'CASE-KA-2024-001', court: 'Karnataka High Court' },
];

export function ECourtsLookup() {
  const [searchQuery, setSearchQuery] = useState('CASE-MH-2024-001');
  const [judgeQuery, setJudgeQuery] = useState('');
  const [lawyerQuery, setLawyerQuery] = useState('');
  const [activeTab, setActiveTab] = useState('case');
  
  const [caseData, setCaseData] = useState(null);
  const [casesList, setCasesList] = useState([]);
  const [courtsList, setCourtsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleSearchCase('CASE-MH-2024-001');
  }, []);

  const handleSearchCase = async (idToSearch) => {
    const caseId = idToSearch || searchQuery;
    if (!caseId.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCaseById(caseId);
      if (response.success) {
        setCaseData(response.data);
      } else {
        setError(response.error || "Case record not found.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Case query error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchJudge = async () => {
    if (!judgeQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCasesByJudge(judgeQuery);
      if (response.success) {
        setCasesList(response.data);
      } else {
        setError(response.error || "No cases found for judge.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Judge query error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLawyer = async () => {
    if (!lawyerQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.getCasesByLawyer(lawyerQuery);
      if (response.success) {
        setCasesList(response.data);
      } else {
        setError(response.error || "No cases found for lawyer.");
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HEARING':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">HEARING</span>;
      case 'RESERVED':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">RESERVED</span>;
      case 'ACTIVE':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">ACTIVE</span>;
      case 'DISPOSED':
        return <span className="bg-paper-surface text-paper-muted border border-paper-border px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">DISPOSED</span>;
      default:
        return <span className="bg-paper-surface text-paper-ink border border-paper-border px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Search Interface */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-paper-border pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">02 / NATIONAL ECOURTS INTEGRATION</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">Indian Case Records Portal</h2>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-paper-muted text-[11px] font-semibold">PRESET CASE IDs:</span>
            {QUICK_CASES.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSearchQuery(item.id);
                  setActiveTab('case');
                  handleSearchCase(item.id);
                }}
                className="bg-paper-surface hover:bg-paper-border text-paper-ink border border-paper-border px-2.5 py-1 transition rounded-sm"
              >
                {item.id}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-paper-border pb-3 font-mono text-xs">
          <button
            onClick={() => setActiveTab('case')}
            className={`px-3 py-1 font-medium transition ${
              activeTab === 'case' ? 'bg-paper-surface text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted hover:text-paper-ink'
            }`}
          >
            CASE LOOKUP
          </button>
          <button
            onClick={() => setActiveTab('judge')}
            className={`px-3 py-1 font-medium transition ${
              activeTab === 'judge' ? 'bg-paper-surface text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted hover:text-paper-ink'
            }`}
          >
            JUDGE SEARCH
          </button>
          <button
            onClick={() => setActiveTab('lawyer')}
            className={`px-3 py-1 font-medium transition ${
              activeTab === 'lawyer' ? 'bg-paper-surface text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted hover:text-paper-ink'
            }`}
          >
            BAR SEARCH
          </button>
          <button
            onClick={() => { setActiveTab('courts'); handleLoadCourts(); }}
            className={`px-3 py-1 font-medium transition ${
              activeTab === 'courts' ? 'bg-paper-surface text-paper-ink font-bold border border-paper-ink shadow-offset-sm' : 'text-paper-muted hover:text-paper-ink'
            }`}
          >
            COURTS DIRECTORY
          </button>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Case ID (e.g. CASE-MH-2024-001)..."
                  className="w-full bg-paper-bg border border-paper-border rounded-sm pl-9 pr-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
                />
              </div>
              <button
                onClick={() => handleSearchCase()}
                disabled={loading}
                className="btn-editorial-rust font-mono"
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
                placeholder="Enter Judge Name (e.g. Hon. Justice R.K. Sharma)..."
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
                placeholder="Enter Bar Reg No (e.g. MAH-10492-2020)..."
                className="w-full bg-paper-bg border border-paper-border rounded-sm px-3 py-2 text-xs text-paper-ink focus:outline-none focus:border-paper-ink"
              />
              <button
                onClick={handleSearchLawyer}
                disabled={loading}
                className="btn-editorial-rust font-mono"
              >
                SEARCH LAWYER
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
      </div>

      {/* Case Details Editorial View */}
      {activeTab === 'case' && caseData && (
        <div className="bg-paper-card border border-paper-ink p-6 shadow-offset space-y-5 rounded-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-4">
            <div>
              <span className="text-[10px] font-mono text-paper-rust font-bold uppercase">{caseData.caseId}</span>
              <h3 className="font-heading text-lg font-bold text-paper-ink mt-0.5 tracking-tight">{caseData.title}</h3>
            </div>
            <div>{getStatusBadge(caseData.status)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">JURISDICTION COURT</span>
              <p className="text-xs font-bold text-paper-ink mt-1">{caseData.court}</p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">ASSIGNED JUDGE</span>
              <p className="text-xs font-bold text-paper-ink mt-1">{caseData.judge}</p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">CASE CATEGORY</span>
              <p className="text-xs font-bold text-paper-ink mt-1">{caseData.caseType}</p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">NEXT HEARING</span>
              <p className="text-xs font-bold text-paper-rust mt-1">{caseData.nextHearing || 'Disposed'}</p>
            </div>
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm">
            <span className="text-[10px] font-mono font-bold text-paper-muted uppercase">PARTIES LISTED</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-mono text-xs">
              <div className="bg-paper-card p-3 rounded-sm border border-paper-border">
                <span className="text-[10px] text-paper-rust font-bold uppercase">Petitioner</span>
                <p className="text-xs font-bold text-paper-ink mt-0.5">{caseData.parties?.petitioner}</p>
              </div>
              <div className="bg-paper-card p-3 rounded-sm border border-paper-border">
                <span className="text-[10px] text-paper-muted font-bold uppercase">Respondent</span>
                <p className="text-xs font-bold text-paper-ink mt-0.5">{caseData.parties?.respondent}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Cases List */}
      {(activeTab === 'judge' || activeTab === 'lawyer') && casesList.length > 0 && (
        <div className="space-y-3 font-mono text-xs">
          <span className="text-paper-muted uppercase font-bold">FOUND {casesList.length} RECORD MATCHES</span>
          {casesList.map((c) => (
            <div key={c.caseId} className="bg-paper-card border border-paper-border rounded-sm p-4 flex items-center justify-between shadow-offset-sm hover:border-paper-ink transition">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-paper-rust">{c.caseId}</span>
                  {getStatusBadge(c.status)}
                </div>
                <h4 className="font-heading text-sm font-bold text-paper-ink mt-1">{c.title}</h4>
                <p className="text-[11px] text-paper-muted">{c.court} · {c.judge}</p>
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
