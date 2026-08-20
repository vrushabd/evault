# eVault

**Blockchain-backed legal document vault** for secure storage, sharing, and integrity verification of case records.

Built for SIH / Ministry of Law & Justice use cases: lawyers file encrypted documents, judges register orders, citizens retrieve authorized records, and every sensitive action is audited.

---

## Why eVault

| Problem | Approach |
|---------|----------|
| Lost or disputed case files | SHA-256 integrity hash + Sepolia metadata registration |
| Informal sharing (email / USB) | Wallet JWT auth + explicit access grants |
| Privacy of legal PDFs | AES-256-GCM encryption; IPFS stores **ciphertext only** |
| Siloed court systems | Case registry + APIs toward eCourts / CMS integration |

**Design rule:** PDFs never go on-chain. The blockchain holds CID, case ID, type, and integrity metadata — not document contents.

---

## Architecture

```text
React UI (:3000)
      │
Spring Cloud Gateway (:8080)
      │
      ├── Auth (:8081)           MetaMask → JWT
      ├── Documents (:8082)      Encrypt · IPFS · MySQL · verify/download
      ├── Blockchain (:8083)     eVault.sol on Ethereum Sepolia
      ├── Audit (:8084)          Append-only event trail
      ├── Notifications (:8085)  Optional alerts
      └── Integration (:8086)    eCourts registry · classifier · identity commitment
```

| Service | Port | Stack |
|---------|------|-------|
| Frontend | 3000 | React + Vite |
| API Gateway | 8080 | Spring Cloud Gateway |
| Auth | 8081 | Spring Boot |
| Documents | 8082 | FastAPI + MySQL + Pinata/IPFS |
| Blockchain | 8083 | Node.js + ethers.js |
| Audit | 8084 | Spring Boot |
| Notifications | 8085 | Spring Boot |
| Integration | 8086 | FastAPI |

---

## Features

- **Lawyer filing** — encrypt PDF, pin to IPFS, register metadata on Sepolia, grant access
- **Judge workspace** — register judicial orders against case IDs
- **Citizen vault** — load by case ID, verify integrity, authorized download
- **Audit trail** — upload, share, download, verify events
- **Identity commitment** — wallet binding without storing raw Aadhaar in the vault
- **Case registry** — eCourts-style case list for filing alignment
- **Document classifier** — assist typing before secure upload

---

## Quick start

### Prerequisites

- Java 17+ (Auth / Gateway); Java 21 for Audit & Notifications if required by those modules
- Python 3.12+, Node.js 18+, MySQL 8
- MetaMask + Sepolia network for real wallet auth

### Setup

1. Copy [`.env.example`](./.env.example) → `.env` and fill:
   - `ENCRYPTION_MASTER_KEY` (64 hex chars)
   - `PINATA_JWT` (or `PINATA_JWT=mock` for local-only IPFS)
   - `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`
   - `JWT_SECRET` (must match Auth service)
2. Follow the full start order in **[START_ALL.md](./START_ALL.md)** (gateway **last**, then frontend).
3. Open **http://localhost:3000** → connect MetaMask → complete identity binding → use Documents / Orders / My vault.

Windows users can also use `start-all.ps1` where available.

### Health checks

| Service | URL |
|---------|-----|
| Gateway | http://localhost:8080/actuator/health |
| Documents | http://localhost:8082/health |
| Blockchain | http://localhost:8083/blockchain/health |
| Audit | http://localhost:8084/audit/health |
| Integration | http://localhost:8086/docs |
| Frontend | http://localhost:3000 |

Browser API traffic goes through the gateway (`:8080`); Vite proxies `/api`, `/blockchain`, `/audit`, `/ecourts`, etc. in development.

---

## Security model (short)

1. **Encrypt** PDF with AES-256-GCM (per-document key via HKDF from `ENCRYPTION_MASTER_KEY`)
2. **Pin** ciphertext to IPFS → CID
3. **Register** CID + hash on Sepolia via `eVault.sol`
4. **Store** metadata in MySQL (never the AES key — only a version reference)
5. **Download** only after JWT authz (uploader or granted wallet)
6. **Verify** compares MySQL vs chain **without** decrypting the PDF

---

## Hackathon deliverables

| Outcome | Link |
|---------|------|
| Design document | [docs/DESIGN_DOCUMENT.md](./docs/DESIGN_DOCUMENT.md) |
| Business plan | [docs/BUSINESS_PLAN.md](./docs/BUSINESS_PLAN.md) |
| Presentation notes | [docs/PRESENTATION.md](./docs/PRESENTATION.md) |
| Pitch deck | [docs/presentation/eVault_Pitch.pptx](./docs/presentation/eVault_Pitch.pptx) |
| Document API notes | [scratch_doc_service/docs/API_CONTRACT.md](./scratch_doc_service/docs/API_CONTRACT.md) |

---

## Config cheat sheet

| Concern | Where |
|---------|--------|
| Shared secrets (Pinata, RPC, encryption, JWT) | Root `.env` |
| Frontend gateway override | `evault-frontend/.env` → `VITE_GATEWAY_URL` |
| Document service examples | `scratch_doc_service/.env.example` |
| Blockchain mock flags | `BLOCKCHAIN_MOCK` / `BLOCKCHAIN_AUTO_MOCK` in `.env` |
| Demo auth without JWT | `ALLOW_MOCK_AUTH` (set `false` for stricter demos) |

---

## Demo notes

- If the blockchain service wallet has **0 Sepolia ETH**, uploads may show `PENDING_CHAIN` / integrity `UNVERIFIED`. Encrypted IPFS + MySQL still succeed; explain this honestly in demos.
- Prefer a **fresh upload** in the session when showing download/verify.
- Case IDs follow `CASE-XX-###` (e.g. `CASE-MH-001`).

---

## Repository layout

```text
evault-frontend/       React app
evault-gateway/        API gateway
evault-auth/           Wallet auth + JWT
scratch_doc_service/   Document encrypt / IPFS / verify
evault-blockchain/     Sepolia adapter + smart contract
evault-audit/          Audit service
evault-notifications/  Notifications
evault-integration/    eCourts · classify · identity
docs/                  Design, business plan, pitch
START_ALL.md           Local runbook
```

---

## License

Prototype for hackathon / academic evaluation. Production court deployment requires formal security review, funded chain ops, and official integration agreements.
