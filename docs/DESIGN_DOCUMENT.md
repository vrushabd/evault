# eVault — Detailed Design Document

**Project:** Blockchain-based eVault for Legal Records  
**Problem statement alignment:** SIH / Ministry of Law & Justice — secure legal document vault  
**Document version:** 1.0  
**Date:** August 2026  
**Status:** Functional prototype

---

## 1. Executive summary

eVault is a microservices prototype that stores, manages, and shares legal records with:

- **Confidentiality** — AES-256-GCM encryption; IPFS holds ciphertext only  
- **Integrity** — SHA-256 content hash + Ethereum Sepolia smart-contract registration  
- **Accessibility** — role-oriented UIs for lawyers, judges, and clients  
- **Accountability** — immutable-style audit logging of upload, share, download, and verify events  
- **Interoperability** — case registry APIs designed for eCourts / CMS-style integration  

PDF bytes are **never** written to the blockchain. The chain stores document identifiers, case IDs, IPFS CIDs, document types, timestamps, roles/permissions, and (where supported) content hashes.

---

## 2. Goals and non-goals

### 2.1 Goals

| Goal | Design response |
|------|-----------------|
| Tamper-evident legal filings | On-chain CID + hash; off-chain verify API |
| Privacy of case documents | Server-side encryption before IPFS pin |
| Multi-stakeholder access | Lawyer / Judge / Citizen workspaces + share grants |
| Court-system alignment | Case IDs, eCourts-style registry, identity commitment |
| Demonstrable prototype | Local stack: React UI → Spring Gateway → services |

### 2.2 Non-goals (prototype)

- Production court deployment / NIC accreditation  
- Full live NIC eCourts production API coupling  
- Client-side (browser) encryption as the only trust model  
- Mainnet Ethereum (demo uses Sepolia testnet)

---

## 3. Stakeholders and use cases

| Stakeholder | Primary actions |
|-------------|-----------------|
| Lawyer | Classify/type document, secure upload, grant access, view receipt |
| Judge | Register judicial orders against case IDs |
| Client / Citizen | Load case documents, verify integrity, download when authorized |
| System / Admin | Roles on contract, audit review, service health |

### Core use cases

1. **UC-01 Secure file** — Lawyer uploads PDF → encrypt → IPFS → chain → MySQL → audit  
2. **UC-02 Retrieve** — Authorized wallet downloads decrypted PDF  
3. **UC-03 Share** — Owner grants time-bounded access to another wallet  
4. **UC-04 Verify** — Compare MySQL metadata to Sepolia without decrypting  
5. **UC-05 Judicial order** — Judge registers sealed order into the same vault  
6. **UC-06 Case registry** — Register/list cases for filing alignment  

---

## 4. System architecture

### 4.1 Logical view

```text
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (:3000) — Lawyer / Judge / Citizen / Tools  │
└────────────────────────────┬────────────────────────────────┘
                             │ Vite proxy / HTTP
┌────────────────────────────▼────────────────────────────────┐
│  Spring Cloud Gateway (:8080) — single API entry            │
└──┬──────┬──────┬──────┬──────┬──────┬───────────────────────┘
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
 Auth   Docs   Chain  Audit  Notify  Integration
 :8081  :8082  :8083  :8084  :8085   :8086
   │      │      │      │              │
   │      ├──────┼──────┘              ├─ eCourts registry
   │      │      │                     ├─ Classifier
   │      │      │                     └─ Identity commitment
   │      │      │
   │   MySQL   Sepolia
   │   IPFS    (eVault.sol)
   │  (Pinata)
   └─ JWT issue / wallet bind
```

### 4.2 Service catalog

| Service | Port | Stack | Responsibility |
|---------|------|-------|----------------|
| `evault-frontend` | 3000 | React + Vite | Stakeholder UIs |
| `evault-gateway` | 8080 | Spring Cloud Gateway | Routing, CORS |
| `evault-auth` | 8081 | Spring Boot | Wallet auth, JWT |
| `scratch_doc_service` | 8082 | FastAPI | Encrypt, IPFS, metadata, download, verify orchestration |
| `evault-blockchain` | 8083 | Node.js + ethers | Smart-contract calls |
| `evault-audit` | 8084 | Spring Boot | Append-only audit events |
| `evault-notifications` | 8085 | Spring Boot | Optional email/notify |
| `evault-integration` | 8086 | FastAPI | eCourts registry, classify, Aadhaar commitment |

### 4.3 Data stores

| Store | Contents |
|-------|----------|
| MySQL `evault_documents` | `doc_id`, `case_id`, `ipfs_cid`, `doc_type`, `uploaded_by`, `document_hash`, `encryption_key_reference`, `key_version`, status, timestamps |
| MySQL / audit DB | Audit events (upload, verify, share, download, deny) |
| IPFS (Pinata) | Encrypted PDF blobs only (CID) |
| Sepolia | Document registry + roles + optional content hash |
| SQLite (integration) | Local case registry + identity commitments |

---

## 5. Security design

### 5.1 Encryption

- Algorithm: **AES-256-GCM**  
- Key derivation: **HKDF-SHA256** from `ENCRYPTION_MASTER_KEY` with per-document version info  
- Payload (v3): `[0x03 ‖ 12-byte nonce ‖ ciphertext ‖ 16-byte tag]`  
- Legacy payloads (nonce ‖ ct ‖ tag) remain decryptable  
- Master key lives only in server environment; AES keys are **not** stored in MySQL  
- MySQL stores `encryption_key_reference` such as `v2:{uuid}` and `key_version`

### 5.2 Integrity

- SHA-256 of plaintext PDF stored as `document_hash` (hex)  
- Optional on-chain `documentContentHashes` via `storeDocumentWithHash` / `verifyDocumentIntegrity`  
- Verify API compares MySQL vs chain **without** downloading or decrypting the PDF

### 5.3 Authentication and authorization

- MetaMask wallet → auth service → JWT  
- Document download: requester must be uploader **or** hold a valid `DocumentAccess` grant  
- Share: owner-only; expired grants denied and audited  
- `ALLOW_MOCK_AUTH` must be **false** for production-like demos

### 5.4 Access control on chain

Smart contract roles: `NONE`, `CLIENT`, `LAWYER`, `JUDGE`, `ADMIN`  
Permissions and document lifecycle (`ACTIVE` / `ARCHIVED` / `REVOKED`) enforced in `eVault.sol`.

### 5.5 Privacy stance on identity

Identity binding uses a **commitment** (HMAC-based), not raw Aadhaar storage in the vault UI. Product copy avoids overclaiming “Aadhaar verified KYC.”

---

## 6. End-to-end flows

### 6.1 Upload (Lawyer Filing)

```text
PDF
 → validate (type, size)
 → SHA-256(plaintext)
 → AES-256-GCM encrypt
 → Pinata pin (ciphertext) → CID
 → blockchain store(docId, caseId, CID, type[, hash])
 → MySQL insert metadata
 → audit UPLOAD
 → return receipt (docId, CID, status, tx if any)
```

Statuses:

- `VERIFIED_BLOCKCHAIN` — chain registration succeeded  
- `UPLOADED_IPFS` / `PENDING_CHAIN` — IPFS + DB ok; chain pending or failed (honest, not faked)

### 6.2 Download

```text
GET /api/documents/{docId} + Bearer JWT
 → authz check
 → load metadata (CID, key ref)
 → fetch ciphertext from IPFS
 → derive key → decrypt
 → audit DOCUMENT_DOWNLOADED
 → return application/pdf
```

### 6.3 Share

```text
Owner JWT → POST share(targetWallet[, expiresAt])
 → DocumentAccess row
 → optional chain permission commit
 → audit ACCESS_GRANTED
```

### 6.4 Verify integrity

```text
GET /api/documents/verify/{docId}
 → MySQL CID + hash
 → chain verify
 → return cidMatch, hashMatch, blockchainVerified, integrity
 (no PDF bytes in response)
```

---

## 7. Smart contract specification (summary)

**Contract:** `eVault.sol` (Solidity ^0.8.20)  
**Network:** Ethereum Sepolia  

| Capability | Functions / state (representative) |
|------------|--------------------------------------|
| Store | `storeDocument`, `storeDocumentWithHash` |
| Verify | `verifyDocument`, `verifyDocumentIntegrity` |
| Lifecycle | `revokeDocument`, versioning / amend events |
| Access | permission commitments, `verifyPermission` |
| Roles | `assignRole`, `userRoles` |
| Events | `DocumentStored`, `DocumentShared`, `DocumentRevoked`, … |

**Design rule:** On-chain data is metadata and integrity evidence — never plaintext legal content.

---

## 8. API surface (gateway paths)

| Path prefix | Upstream |
|-------------|----------|
| `/api/auth/**` | Auth :8081 |
| `/api/documents/**` | Documents :8082 |
| `/blockchain/**` | Blockchain :8083 |
| `/audit/**` | Audit :8084 |
| `/api/notifications/**` | Notifications :8085 |
| `/ecourts/**`, `/classify/**`, `/aadhaar/**` | Integration :8086 |

Frontend in development proxies through Vite to the gateway so the browser stays same-origin.

---

## 9. Frontend design

| Workspace | Module | Purpose |
|-----------|--------|---------|
| Lawyer | `LawyerDashboard` | Secure upload, grant access, receipt |
| Judge | `JudgeDashboard` | Judicial order registration |
| Citizen | `ClientDashboard` | Case load, download, integrity panel |
| Tools | Classifier, Identity Commitment, status | Assist filing & binding |

UX principles for the prototype: clear secure-action wording, live system/Sepolia/encryption indicators, technical IDs in monospace.

---

## 10. Integration design

### 10.1 Case registry (`/ecourts`)

Persistent local registry for case IDs, parties, judge assignment — stands in for CMS/eCourts linkage in the hackathon prototype. Lawyers and judges can register and list cases without fake hard-coded case tables.

### 10.2 Classifier (`/classify`)

Assists document typing before secure filing; lawyer remains responsible for confirmation.

### 10.3 Identity commitment (`/aadhaar`)

Wallet ↔ privacy-preserving commitment for demo identity binding.

### 10.4 Future interoperability

- Official eCourts / NJDG APIs behind the same integration service  
- Court CMS webhooks on document status  
- DigiLocker-style citizen retrieval (policy-dependent)

---

## 11. Scalability and adaptability

| Concern | Approach |
|---------|----------|
| Scale-out | Stateless services behind gateway; DB and IPFS scale independently |
| Chain cost | Store hashes/CIDs only; batch or L2 later |
| Crypto agility | `key_version` + versioned ciphertext header |
| Contract upgrades | New methods with legacy fallbacks in Node client |
| Deployment | Env-driven URLs/secrets; mock flags off for honest demos |

---

## 12. Technology stack

| Layer | Choices |
|-------|---------|
| UI | React, Vite, Tailwind |
| API edge | Spring Cloud Gateway |
| Auth / Audit / Notify | Java Spring Boot |
| Documents / Integration | Python FastAPI |
| Chain adapter | Node.js, ethers.js |
| Ledger | Ethereum Sepolia |
| Storage | MySQL, IPFS via Pinata |
| AuthN | MetaMask + JWT |

---

## 13. Threat model (abbreviated)

| Threat | Mitigation |
|--------|------------|
| CID leakage | Ciphertext only; decrypt needs server key + authz |
| Unauthorized download | JWT + owner/grant checks; audit denials |
| Metadata tampering | Chain verify vs MySQL |
| Fake “verified” UX | No silent mock txs when mock flags are off |
| Key compromise | Rotate master key; versioned re-encrypt path |

---

## 14. Deployment and operations

See repository root `START_ALL.md` for local start order (gateway last).

**Required secrets (examples):** `ENCRYPTION_MASTER_KEY`, `PINATA_JWT`, `JWT_SECRET`, blockchain RPC + private key, `CONTRACT_ADDRESS`.

**Demo honesty:** If the service wallet has zero Sepolia ETH, uploads may remain `PENDING_CHAIN`; integrity still exists off-chain and verify reports chain status truthfully.

---

## 15. Requirements traceability

| Hackathon requirement | Design coverage |
|-----------------------|-----------------|
| 1. Blockchain + smart contracts | Sepolia + `eVault.sol` |
| 2. Stakeholder UIs | Lawyer / Judge / Client modules |
| 3. Privacy & access control | AES-GCM, JWT, grants, audit |
| 4. Legal DB / CMS integration | Integration service + case registry (extensible) |
| 5. Scalable / adaptable | Microservice architecture + versioned crypto |

---

## 16. Future work

1. Funded / permissioned chain ops for always-on registration  
2. Official eCourts production connectors  
3. Optional client-side encryption for higher threat models  
4. Formal security audit and penetration test  
5. Court pilot with change management and training  

---

## 17. Document control

| Item | Value |
|------|-------|
| Companion docs | `docs/BUSINESS_PLAN.md`, `docs/PRESENTATION.md`, `docs/presentation/eVault_Pitch.pptx` |
| Code roots | `evault-*`, `scratch_doc_service` |
| Runbook | `START_ALL.md`, `README.md` |
