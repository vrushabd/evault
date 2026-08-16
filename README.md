# eVault

Tamper-evident legal document vault (SIH260229 — Ministry of Law & Justice).

Microservices: Auth · Documents (IPFS) · Blockchain (Sepolia) · Audit · Notifications · Integration (eCourts / AI / Aadhaar) · API Gateway · React frontend.

## Hackathon deliverables

| Outcome | Document |
|---------|----------|
| Design document | [docs/DESIGN_DOCUMENT.md](./docs/DESIGN_DOCUMENT.md) |
| Business plan | [docs/BUSINESS_PLAN.md](./docs/BUSINESS_PLAN.md) |
| Presentation notes | [docs/PRESENTATION.md](./docs/PRESENTATION.md) |
| Pitch deck (PPTX) | [docs/presentation/eVault_Pitch.pptx](./docs/presentation/eVault_Pitch.pptx) |

## Quick start

See [START_ALL.md](./START_ALL.md) for the full local run order.

1. Copy [`.env.example`](./.env.example) → `.env` and fill keys (Pinata, Alchemy, Gemini, etc.).
2. Start services **1 → 7** (gateway last), then the frontend.
3. Open http://localhost:3000 — connect MetaMask for real JWT auth.

## Config notes

| Concern | Where |
|--------|--------|
| Frontend gateway URL | `evault-frontend/.env` → `VITE_GATEWAY_URL` |
| Shared secrets | Root `.env` (symlinked into blockchain / docs / integration) |
| Java DB / mail / JWT | Env vars overriding each service `application.yml` / `.properties` |
| Notifications via gateway | `/api/notifications/**` → port 8085 |
