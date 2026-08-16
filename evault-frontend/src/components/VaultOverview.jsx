import React from 'react';
import { Database, CheckCircle } from '@phosphor-icons/react';

const SERVICES = [
  { id: 1, name: 'API Gateway', tech: 'Spring Cloud Gateway', port: 8080, status: 'Active', desc: 'Central routing & rate limiting' },
  { id: 2, name: 'Auth Service', tech: 'Spring Boot + MySQL', port: 8081, status: 'Active', desc: 'JWT user authentication & roles' },
  { id: 3, name: 'Document Service', tech: 'Python FastAPI + MySQL + Pinata IPFS', port: 8082, status: 'Active', desc: 'Encrypted legal document vault & metadata' },
  { id: 4, name: 'Blockchain Service', tech: 'Node.js + ethers.js', port: 8083, status: 'Active', desc: 'Smart contract state pinning' },
  { id: 5, name: 'Audit Service', tech: 'Spring Boot + MySQL', port: 8084, status: 'Active', desc: 'Tamper-evident access audit log' },
  { id: 6, name: 'Notification Service', tech: 'Spring Boot + Mail', port: 8085, status: 'Active', desc: 'Bail & hearing alert dispatch' },
  { id: 7, name: 'Integration Service', tech: 'Python + FastAPI + Gemini', port: 8086, status: 'ONLINE', isCurrent: true, desc: 'eCourts mock, Gemini AI classifier, Aadhaar binding' },
  { id: 8, name: 'Web Frontend', tech: 'React + Tailwind + Ethers.js', port: 3000, status: 'ONLINE', desc: 'SIH 2026 Judge & Citizen Portal' },
];

export function VaultOverview() {
  return (
    <div className="space-y-6">
      
      {/* Topology Header */}
      <div className="bg-paper-card border border-paper-border p-6 shadow-offset-sm rounded-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-paper-rust">04 / SYSTEM ARCHITECTURE MANIFEST</span>
            <h2 className="font-heading text-xl font-bold text-paper-ink tracking-tight mt-0.5">eVault Microservices Topology</h2>
            <p className="text-xs text-paper-muted mt-1 font-body">
              Problem Statement SIH260229 (Ministry of Law and Justice)
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-paper-surface border border-paper-border px-3 py-1.5 rounded-sm text-paper-ink font-mono text-xs font-bold">
            <CheckCircle size={16} weight="fill" className="text-paper-rust" />
            <span>SIH260229 VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Grid of Microservices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {SERVICES.map((svc) => (
          <div
            key={svc.id}
            className={`p-4 rounded-sm border transition-all ${
              svc.isCurrent
                ? 'bg-paper-card border-paper-ink shadow-offset-rust'
                : 'bg-paper-card border-paper-border hover:border-paper-ink shadow-offset-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-paper-muted font-bold">PORT {svc.port}</span>
              <span className={`px-2 py-0.5 rounded-sm text-[9px] font-bold ${
                svc.isCurrent 
                  ? 'bg-paper-rust text-white font-bold'
                  : 'bg-paper-surface text-paper-muted border border-paper-border'
              }`}>
                {svc.status}
              </span>
            </div>

            <h3 className="font-heading text-base font-bold text-paper-ink mt-2.5">{svc.name}</h3>
            <p className="text-[11px] text-paper-rust font-bold mt-0.5">{svc.tech}</p>
            <p className="text-[11px] text-paper-muted mt-2 leading-relaxed font-body">{svc.desc}</p>
          </div>
        ))}
      </div>

      {/* Integration Component Spec */}
      <div className="bg-paper-card border border-paper-border rounded-sm p-6 shadow-offset-sm space-y-4">
        <h3 className="font-heading text-sm font-bold text-paper-ink uppercase flex items-center space-x-2 border-b border-paper-border pb-3">
          <Database size={18} weight="bold" className="text-paper-rust" />
          <span>Integration Service (Port 8086) Component Manifest</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm">
            <span className="text-paper-rust font-bold">1. eCourts Mock API</span>
            <p className="text-xs text-paper-muted mt-1 font-body">Simulates national court case management with realistic data for Mumbai, Delhi, Karnataka High Courts, judges, and lawyers.</p>
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm">
            <span className="text-paper-rust font-bold">2. AI Document Classifier</span>
            <p className="text-xs text-paper-muted mt-1 font-body">Extracts OCR text via <code className="text-paper-ink font-bold">pdfplumber</code> and analyzes metadata using Google Gemini 1.5 Flash.</p>
          </div>

          <div className="bg-paper-surface border border-paper-border p-4 rounded-sm">
            <span className="text-paper-rust font-bold">3. Aadhaar Identity Binding</span>
            <p className="text-xs text-paper-muted mt-1 font-body">Hashes 12-digit Aadhaar using SHA-256 and binds to Web3 wallet addresses in-memory. Zero plain-text storage.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
export default VaultOverview;
