# eVault Document Microservice 📄🔐

This is the standalone **Document Microservice** for the SIH 2026 eVault project. It is responsible for handling all document storage, encryption, IPFS off-chain bridging, and metadata tracking.

Built with **Python 3.12** and **FastAPI**.

## Features
- **AES-256-GCM Encryption**: Documents are encrypted client-side (within the service boundary) before being sent externally.
- **IPFS Pinata Integration**: Encrypted blobs are pinned to IPFS for decentralized availability.
- **Microservice Integration**: Communicates over REST with `evault-blockchain`, `evault-audit`, `evault-notifications`, and `evault-integration`.
- **MySQL Data Layer**: Uses async SQLAlchemy with Alembic migrations.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Or: Python 3.12+, MySQL Server

### Environment Setup
1. Copy `.env.example` to `.env`.
2. Fill in your Pinata keys and MySQL credentials.

### Running via Docker
```bash
docker-compose up --build
```
The API will be available at `http://localhost:8082`.
Interactive Swagger docs: `http://localhost:8082/docs`

### Running Locally (Without Docker)
```bash
python -m venv venv
source venv/bin/activate  # Or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8082 --reload
```

## Testing
Run the comprehensive test suite (Unit and Integration):
```bash
pytest
```

## API Documentation
Please refer to [docs/API_CONTRACT.md](docs/API_CONTRACT.md) for full endpoint schemas.
