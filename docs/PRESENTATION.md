# eVault — Presentation Speaker Notes

**Use with:** `docs/presentation/eVault_Pitch.pptx`  
**Total time:** ~10–12 minutes + demo + Q&A  
**SIH / Law & Justice theme:** Blockchain eVault for legal records

---

## Slide 1 — Title
**Say:** “eVault — a blockchain-backed vault for legal records: secure, transparent, and usable by lawyers, judges, and clients.”

---

## Slide 2 — Problem
**Say:** Case files are fragmented; sharing is informal; authenticity is hard to prove; litigants struggle to get their own documents. This slows justice and weakens trust.

---

## Slide 3 — Solution
**Say:** We encrypt PDFs, store ciphertext on IPFS, keep metadata in databases, and register fingerprints on Ethereum. Stakeholders use role-based apps — not raw chain wallets alone.

---

## Slide 4 — Architecture
**Say:** React UI → API Gateway → Auth, Documents, Blockchain, Audit, Notifications, Integration. MySQL + IPFS + Sepolia. Microservices so we can scale and upgrade parts independently.

---

## Slide 5 — Security
**Say:** AES-256-GCM; keys derived server-side; JWT and wallet auth; explicit share grants; audit on upload, download, share. CID alone cannot yield plaintext.

---

## Slide 6 — Smart contracts
**Say:** `eVault.sol` on Sepolia stores CID, case ID, type, roles, permissions, optional content hash — never the PDF itself.

---

## Slide 7 — Stakeholder UIs
**Say:** Lawyer filing, Judge orders, Citizen vault with verify and download. Tools for classification and identity commitment.

---

## Slide 8 — Integration
**Say:** Case registry and APIs toward eCourts/CMS. Prototype proves interoperability path without fake hard-coded cases.

---

## Slide 9 — Live demo flow
**Say:** Connect wallet → secure upload → show receipt → verify integrity → download as authorized party. (Run live here.)

---

## Slide 10 — Business & impact
**Say:** Impact: faster retrieval, integrity, access to justice. Revenue: court licenses, integration projects, AMC — not selling case content.

---

## Slide 11 — Roadmap
**Say:** Prototype → court pilot → official connectors → multi-state scale with formal security audit.

---

## Slide 12 — Closing
**Say:** We deliver a working prototype plus design and business plan. eVault makes legal records confidential, verifiable, and accessible to the right stakeholders. Thank you — questions welcome.
