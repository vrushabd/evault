import React, { useState } from 'react';
import { Sparkle, UploadSimple, CheckCircle, Warning, FileText, MagnifyingGlass, Scales, ArrowsClockwise } from '@phosphor-icons/react';
import api from '../services/api';

const SAMPLE_TEXTS = {
  FIR: "FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.). Police Station: Bandra, District: Mumbai Suburban. FIR No: 2024-MH-9918. Date: 2024-01-15. State of Maharashtra vs Ramesh Sharma. Offence under Section 420, 406 IPC. Complainant reports fraudulent transaction of funds.",
  BailOrder: "IN THE HIGH COURT OF JUDICATURE AT BOMBAY. Criminal Bail Application No. 8812 of 2024. Ananya Rao vs State of Maharashtra. ORDER: Heard learned counsel for applicant. Considering applicant has no prior criminal antecedents and investigation is complete, application for bail is ALLOWED upon furnishing personal bond of Rs 50,000.",
  Judgment: "IN THE SUPREME COURT OF INDIA. Civil Appellate Jurisdiction. Civil Appeal No. 4410 of 2024. M/S TechCorp India vs Union of India. Dated: 2024-03-20. JUDGMENT: Hon. Justice R.K. Sharma. The impugned order of the High Court is hereby set aside. Parties to bear their own costs."
};

export function ClassifierModule() {
  const [activeInputMode, setActiveInputMode] = useState('text');
  const [inputText, setInputText] = useState(SAMPLE_TEXTS.FIR);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleClassifyText = async () => {
    if (!inputText.trim()) {
      setError("Please input legal document text.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.classifyText(inputText);
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || "Classification failed.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to classify text.");
    } finally {
      setLoading(false);
    }
  };

  const handleClassifyFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a PDF document.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.classifyDocument(selectedFile);
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || "Failed to analyze PDF.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "PDF analysis error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Editorial Workbench Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Column (7 cols) */}
        <div className="lg:col-span-7 bg-paper-card border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-4">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">01 / DOCUMENT ANALYSIS WORKBENCH</span>
              <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">AI Document Classifier</h2>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-paper-surface border border-paper-border p-1 font-mono text-xs rounded-sm self-start sm:self-auto">
              <button
                onClick={() => { setActiveInputMode('text'); setError(null); }}
                className={`px-3 py-1 font-medium transition ${
                  activeInputMode === 'text'
                    ? 'bg-paper-card text-paper-ink font-bold border border-paper-ink shadow-offset-sm'
                    : 'text-paper-muted hover:text-paper-ink'
                }`}
              >
                TEXT
              </button>
              <button
                onClick={() => { setActiveInputMode('file'); setError(null); }}
                className={`px-3 py-1 font-medium transition ${
                  activeInputMode === 'file'
                    ? 'bg-paper-card text-paper-ink font-bold border border-paper-ink shadow-offset-sm'
                    : 'text-paper-muted hover:text-paper-ink'
                }`}
              >
                PDF UPLOAD
              </button>
            </div>
          </div>

          {activeInputMode === 'text' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-paper-muted text-[11px] font-semibold uppercase">PRESETS:</span>
                <button
                  onClick={() => setInputText(SAMPLE_TEXTS.FIR)}
                  className="bg-paper-surface hover:bg-paper-border text-paper-ink border border-paper-border px-2.5 py-1 transition rounded-sm"
                >
                  FIR Sample
                </button>
                <button
                  onClick={() => setInputText(SAMPLE_TEXTS.BailOrder)}
                  className="bg-paper-surface hover:bg-paper-border text-paper-ink border border-paper-border px-2.5 py-1 transition rounded-sm"
                >
                  Bail Order
                </button>
                <button
                  onClick={() => setInputText(SAMPLE_TEXTS.Judgment)}
                  className="bg-paper-surface hover:bg-paper-border text-paper-ink border border-paper-border px-2.5 py-1 transition rounded-sm"
                >
                  Judgment
                </button>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={7}
                placeholder="Paste legal text..."
                className="w-full bg-paper-bg border border-paper-border p-3.5 text-xs text-paper-ink font-mono focus:outline-none focus:border-paper-ink transition rounded-sm"
              />

              <button
                onClick={handleClassifyText}
                disabled={loading}
                className="btn-editorial-rust font-mono"
              >
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <Sparkle size={16} weight="bold" />}
                <span>{loading ? 'CLASSIFYING...' : 'RUN CLASSIFIER'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleClassifyFile} className="space-y-4">
              <div className="border border-dashed border-paper-border hover:border-paper-ink p-8 text-center bg-paper-bg transition cursor-pointer relative rounded-sm">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadSimple size={32} weight="bold" className="text-paper-rust mx-auto mb-2" />
                <p className="font-heading text-sm font-bold text-paper-ink">
                  {selectedFile ? selectedFile.name : 'Select or Drop Legal PDF Document'}
                </p>
                <p className="text-xs text-paper-muted mt-1 font-mono">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports Court PDF up to 10MB'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="btn-editorial-rust font-mono"
              >
                {loading ? <ArrowsClockwise size={16} className="animate-spin" /> : <MagnifyingGlass size={16} weight="bold" />}
                <span>{loading ? 'ANALYZING PDF...' : 'ANALYZE PDF'}</span>
              </button>
            </form>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-sm flex items-center space-x-2 text-red-800 text-xs font-mono">
              <Warning size={16} weight="bold" className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Informational Column (5 cols) */}
        <div className="lg:col-span-5 bg-paper-surface border border-paper-border p-6 shadow-offset-sm space-y-4 rounded-sm flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-muted">ARCHIVAL ENGINE SPECIFICATION</span>
            <h3 className="font-heading text-lg font-bold text-paper-ink leading-snug">
              Dual-Layer OCR & Generative Legal Extraction
            </h3>
            <p className="text-xs text-paper-muted leading-relaxed font-body">
              Combines <strong className="text-paper-ink font-semibold">pdfplumber</strong> structural page parsing with <strong className="text-paper-rust font-semibold">Google Gemini 1.5 Flash</strong> inference to categorize FIRs, judgments, bail orders, and charge sheets into verified JSON metadata.
            </p>
          </div>

          <div className="border-t border-paper-border pt-4 space-y-2 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-paper-border/60">
              <span className="text-paper-muted">OCR Engine:</span>
              <span className="font-bold text-paper-ink">pdfplumber v0.11</span>
            </div>
            <div className="flex justify-between py-1 border-b border-paper-border/60">
              <span className="text-paper-muted">AI Model:</span>
              <span className="font-bold text-paper-rust">gemini-1.5-flash</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-paper-muted">REST Endpoint:</span>
              <span className="font-bold text-paper-ink">/classify/document</span>
            </div>
          </div>
        </div>

      </div>

      {/* Structured Output Display */}
      {result && (
        <div className="bg-paper-card border border-paper-ink p-6 shadow-offset space-y-5 rounded-sm">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-border pb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle size={22} weight="fill" className="text-paper-rust" />
              <h3 className="font-heading text-lg font-bold text-paper-ink tracking-tight">Extracted Metadata Digest</h3>
            </div>

            <div className="flex items-center space-x-2 font-mono text-xs bg-paper-surface border border-paper-border px-3 py-1 rounded-sm">
              <span className="text-paper-muted">Confidence Score:</span>
              <span className="font-bold text-paper-rust">
                {(result.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
            
            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">Document Type</span>
              <div className="mt-1">
                <span className="bg-paper-rust text-white font-bold px-2.5 py-0.5 rounded-sm uppercase text-[11px]">
                  {result.documentType}
                </span>
              </div>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">Case Number</span>
              <p className="text-xs font-bold text-paper-ink mt-1">
                {result.caseNumber || 'N/A'}
              </p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">Document Date</span>
              <p className="text-xs font-bold text-paper-ink mt-1">
                {result.date || 'N/A'}
              </p>
            </div>

            <div className="bg-paper-surface border border-paper-border p-3.5 rounded-sm">
              <span className="text-[10px] text-paper-muted uppercase font-bold">Court Jurisdiction</span>
              <p className="text-xs font-bold text-paper-ink mt-1 truncate">
                {result.court || 'N/A'}
              </p>
            </div>

          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm space-y-2">
            <span className="text-[10px] font-mono font-bold text-paper-muted uppercase">PARTIES LISTED IN RECORD</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="bg-paper-card p-3 rounded-sm border border-paper-border">
                <span className="text-[10px] text-paper-rust font-bold uppercase">Petitioner</span>
                <p className="text-xs font-bold text-paper-ink mt-0.5">{result.parties?.petitioner || 'State of Maharashtra'}</p>
              </div>
              <div className="bg-paper-card p-3 rounded-sm border border-paper-border">
                <span className="text-[10px] text-paper-muted font-bold uppercase">Respondent</span>
                <p className="text-xs font-bold text-paper-ink mt-0.5">{result.parties?.respondent || 'Unspecified'}</p>
              </div>
            </div>
          </div>

          {result.rawText && (
            <div className="bg-paper-surface border border-paper-border p-4 rounded-sm">
              <span className="text-[10px] font-mono font-bold text-paper-muted uppercase">RAW OCR TEXT PREVIEW</span>
              <p className="text-xs font-mono text-paper-ink mt-2 leading-relaxed bg-paper-card p-3 rounded-sm border border-paper-border">
                {result.rawText}
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
export default ClassifierModule;
