# eVault Blockchain Microservice

Blockchain layer for **eVault** — a tamper-proof digital vault for Indian legal documents (SIH260229, Ministry of Law and Justice).

This service is the **only** component that talks directly to the Ethereum smart contract. All other microservices call it via REST.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, ethers.js v6 |
| Network | Ethereum Sepolia Testnet |
| Contract | `eVault.sol` |
| Frontend | React + Vite (monitoring dashboard on port 3001) |

## Project Structure

```
evault-blockchain/
├── src/                    # Express backend
│   ├── index.js
│   ├── config/web3.js
│   ├── services/contractService.js
│   └── routes/blockchain.js
├── contracts/
│   ├── eVault.sol
│   └── eVault.abi.json
├── scripts/deploy.js
├── frontend/               # React monitoring UI
└── .env.example
```

## Setup

### 1. Backend

```bash
cd evault-blockchain
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=8083
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
CONTRACT_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS
```

### 2. Deploy contract (if not already deployed)

Option A — Remix IDE: paste `contracts/eVault.sol`, deploy to Sepolia, copy address into `.env`.

Option B — deploy script (requires `solc`):

```bash
npm install solc --save-dev
npm run deploy
```

### 3. Start backend

```bash
npm run dev
```

Health check: http://localhost:8083/blockchain/health

On startup the service validates the Sepolia RPC connection, confirms that
`CONTRACT_ADDRESS` has bytecode on-chain, prints the configured wallet and
balance, and warns if the wallet is not the contract owner. Wrong network or a
missing contract stops the process with exit code `1`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:3001

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/blockchain/health` | Service + chain status |
| POST | `/blockchain/store` | Store document CID on-chain |
| POST | `/blockchain/amend` | Amend document (new version) |
| GET | `/blockchain/verify/:docId?cid=` | Tamper detection |
| GET | `/blockchain/document/:docId` | Full document record |
| POST | `/blockchain/share` | Share document access |
| POST | `/blockchain/permissions/commit` | Commit a permission hash on-chain |
| GET | `/blockchain/permissions/verify/:docId/:wallet?hash=` | Verify a permission hash |
| POST | `/blockchain/revoke` | Revoke document |
| POST | `/blockchain/sign` | Judge signature (2-of-2 approval) |
| POST | `/blockchain/roles/assign` | Assign wallet role |
| GET | `/blockchain/roles/:wallet` | Get wallet role |
| GET | `/blockchain/audit/:docId` | Immutable audit trail |
| GET | `/blockchain/signatures/:docId` | Signature count + approval |

All responses: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`.

## Integration with other services

**Document Service (8082)** after Pinata upload:

```http
POST http://localhost:8083/blockchain/store
Content-Type: application/json

{
  "docId": "DOC-2024-001",
  "caseId": "CASE-MH-2024-001",
  "ipfsCID": "QmXyz...",
  "docType": "FIR"
}
```

**Audit Service (8084)**:

```http
GET http://localhost:8083/blockchain/audit/DOC-2024-001
```

### Permission commitment flow

Permission commitments protect the Document Service authorization table from
silent database tampering. The Document Service stores the normal permission
grant in MySQL, then commits a deterministic hash of that grant to Sepolia. Each
time it serves a protected document, it recomputes the same hash and asks the
Blockchain Service to verify it against the on-chain commitment.

When sharing a document:

1. Grant access in MySQL with the existing permission fields.
2. Compute `permissionHash = SHA256(docId + walletAddress + grantedAt)`.
3. Call the Blockchain Service:

```http
POST http://localhost:8083/blockchain/permissions/commit
Content-Type: application/json

{
  "docId": "DOC-2024-001",
  "grantedTo": "0xWalletAddress",
  "permissionHash": "0xSHA256HashHex"
}
```

When serving a document:

1. Fetch the grant from MySQL.
2. Recompute `permissionHash` from the stored `docId`, `walletAddress`, and
   `grantedAt`.
3. Verify the commitment:

```http
GET http://localhost:8083/blockchain/permissions/verify/DOC-2024-001/0xWalletAddress?hash=0xSHA256HashHex
```

If the response contains `"isValid": false`, return `403
AUTHORIZATION_INTEGRITY_FAILURE` and do not serve the document. A `true` result
means the MySQL grant still matches the on-chain commitment.

## Demo flow (hackathon)

1. **Store** — submit a CID, show Etherscan tx link
2. **Verify (match)** — same CID → green "DOCUMENT VERIFIED"
3. **Verify (tamper)** — change one character → red "DOCUMENT TAMPERED"
4. **Audit Log** — show immutable UPLOAD/VERIFY/SHARE trail
5. **Roles** — assign JUDGE, sign 2× → document APPROVED

## Roles

| Role | Value | Access |
|------|-------|--------|
| NONE | 0 | No role |
| CLIENT | 1 | Own documents |
| LAWYER | 2 | Assigned cases |
| JUDGE | 3 | Full access + signing |
| ADMIN | 4 | Role assignment |

## License

MIT — Smart India Hackathon 2026
