# eVault — Business Plan

**Product:** Blockchain-based eVault for Legal Records (India)  
**Version:** 1.0  
**Date:** August 2026  
**Audience:** Hackathon evaluators, faculty, potential pilot partners

---

## 1. Vision

Make every critical legal record **secure to store, easy to share with the right people, and impossible to silently alter** — improving access to justice through integrity, speed, and trust.

---

## 2. Problem

India’s justice system still relies heavily on fragmented paper and siloed digital files. That creates:

| Pain | Consequence |
|------|-------------|
| Lost or delayed case files | Adjournments, longer case life |
| Weak chain of custody | Disputes over “which copy is authentic” |
| Uncontrolled sharing (email, USB) | Leakage of sensitive filings |
| Uneven access for litigants | Clients cannot easily obtain their own records |
| High coordination cost | Lawyers, courts, and clients duplicate effort |

Digital court initiatives exist, but many workflows still lack a **unified, privacy-preserving, tamper-evident vault** that stakeholders can use together.

---

## 3. Solution

**eVault** is a blockchain-anchored legal document vault:

1. Encrypt documents (AES-256-GCM) before storage  
2. Store ciphertext on IPFS; metadata in secure databases  
3. Register CID + integrity hash on Ethereum (Sepolia prototype / production network later)  
4. Enforce wallet/JWT authentication and explicit share grants  
5. Expose lawyer, judge, and citizen interfaces  
6. Integrate via APIs toward eCourts / case management systems  

**Value proposition:** *Confidentiality off-chain, verifiability on-chain, accessibility by role.*

---

## 4. Target customers and beneficiaries

| Segment | Need | eVault offer |
|---------|------|--------------|
| District & high courts | Integrity of orders and filings | Judicial order registration + verify |
| Law firms / legal aid | Secure client document handling | Encrypted upload + controlled share |
| Litigants / citizens | Access to own case papers | Citizen vault download when authorized |
| Legal services authorities | Transparent aid case files | Audit trail + case-linked docs |
| Ministry / NIC programs | Interoperable justice infra | API gateway + registry adapters |

Primary early beachhead: **pilot courts + associated bar associations**, not full national cutover.

---

## 5. Market opportunity

### 5.1 Context

- Large and growing volume of cases and digital filings under eCourts / CIS modernization  
- National push for transparent, citizen-centric justice delivery  
- Rising demand for cybersecurity and data protection compliance in public systems  

### 5.2 Opportunity framing (hackathon / early venture)

| Layer | Description |
|-------|-------------|
| Core vault | Encrypted storage + blockchain integrity as a shared utility |
| Integration | Connectors to CMS, eCourts-style registries, DigiLocker-class citizen access |
| Services | Onboarding, training, SLA operations for courts and firms |
| Analytics (privacy-safe) | Aggregate filing latency / integrity metrics for administrators |

Exact TAM/SAM/SOM figures for production procurement should be validated with MoL&J / state court data before commercial claims. For this plan, the opportunity is framed as **public-digital-goods + B2G/B2B services**, not consumer SaaS ads.

---

## 6. Impact (aligned to hackathon statement)

| Impact area | How eVault helps |
|-------------|------------------|
| Faster proceedings | Less time hunting for the “right” PDF; shared case vault |
| Lower cost | Fewer reprints, couriers, and re-filings of lost documents |
| Data integrity | Hash + chain verify detects silent substitution |
| Trust | Auditable access; clear authorization |
| Access to justice | Clients retrieve authorized records without informal intermediaries |
| Transparency | On-chain registration of document fingerprints (not private content) |

---

## 7. Product roadmap

| Phase | Scope | Outcome |
|-------|-------|---------|
| **P0 — Prototype (now)** | Upload, retrieve, share, verify; Sepolia; role UIs; case registry | Hackathon demo |
| **P1 — Pilot** | One court complex; funded chain ops; SSO/court IDs; training | 90-day pilot report |
| **P2 — Integration** | Official eCourts/CMS adapters; DigiLocker-style retrieval policy | Interoperability |
| **P3 — Scale** | Multi-state; HA deploy; formal audit; L2/permissioned options | Production service |

---

## 8. Competitive landscape

| Approach | Strength | Gap vs eVault |
|----------|----------|---------------|
| Shared drives / email | Familiar | Weak integrity & access audit |
| Generic cloud DMS | Usability | Not justice-workflow or chain-anchored |
| Pure on-chain document storage | Immutability narrative | Cost, privacy, GDPR/DPDP conflict |
| Closed court CMS only | Official process | Limited cross-stakeholder share & citizen UX |

**Positioning:** Hybrid vault — *private content, public integrity proofs, justice-specific roles.*

---

## 9. Business / revenue models

Sustainable models suitable for Indian justice tech:

### 9.1 Primary (public sector)

1. **Government / court licensing** — annual platform license per court complex or state  
2. **Implementation & integration fees** — CMS/eCourts connectors, migration, training  
3. **Managed operations (AMC)** — SLAs, key management ops, monitoring, upgrades  

### 9.2 Secondary (professional)

4. **Law-firm / LSA subscriptions** — secure chambers vault with court-ready export/verify  
5. **Verification API** — metered integrity checks for registries and legal tech apps  

### 9.3 What we will not monetize

- Selling access to confidential case contents  
- Advertising against litigant data  

### 9.4 Illustrative unit economics (pilot narrative)

| Item | Example (illustrative) |
|------|-------------------------|
| Pilot court complex | Fixed implementation + 12-month AMC |
| Per-document variable cost | IPFS pin + negligible chain metadata gas (L2 later) |
| Value captured | Reduced adjournments / retrieval labor (qualitative KPI in pilot) |

*Numbers for bids should be built from actual infra quotes and court IT budgets.*

---

## 10. Go-to-market

1. Win hackathon / academic validation with working prototype + design + this plan  
2. Faculty / legal-tech mentors → introductions to court IT cells  
3. 90-day pilot: one case type (e.g., bail orders / certified copies)  
4. Publish integrity KPIs (verify success rate, mean retrieval time)  
5. Expand via state court committees and legal services authorities  

---

## 11. Operating model

| Function | Approach |
|----------|----------|
| Product | Microservices vault; gateway API |
| Security | Key custody procedures; audit; bug bounty later |
| Compliance | Align with IT Act, DPDP principles; minimize PII on-chain |
| Support | Tiered support for court admins and registered advocates |
| Partnerships | Cloud/IPFS providers; blockchain infra; system integrators |

---

## 12. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Chain fees / ops failures | Metadata-only; L2 or permissioned chain; honest pending states |
| Adoption resistance | Role UIs matching lawyer/judge/client jobs; training |
| Regulatory sensitivity (Aadhaar/KYC) | Commitment-based binding; no raw ID vaulting |
| Vendor lock-in (IPFS/cloud) | CID-portable; multi-gateway retrieval |
| Key mismanagement | HSM/KMS in production; versioned re-encryption |

---

## 13. Success metrics (pilot)

- % filings with successful integrity verify  
- Median time from upload to authorized download  
- Share grants used vs informal email sends (survey)  
- User satisfaction (lawyer / clerk / judge)  
- Zero critical confidentiality incidents  

---

## 14. Team and ask (hackathon framing)

**Delivered:** Functional prototype, design document, business plan, presentation.  

**Ask from evaluators / partners:** Feedback, pilot introduction, and mentorship toward a court-ready P1 deployment.

---

## 15. Conclusion

eVault turns legal records into **encrypted, shareable, verifiable assets**. That directly supports the hackathon impact goals: faster proceedings, lower cost, stronger integrity, and better access to justice — with a realistic path from prototype to public-sector pilot and sustainable AMC-based revenue.
