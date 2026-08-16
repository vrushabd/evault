# eVault — How to Run All Services Locally

## Prerequisites
- Java 17+, Maven
- Python 3.12+, pip
- Node.js 18+, npm
- MySQL 8 running locally (user: `root`, empty password or set `DB_PASSWORD`)

Root `.env` is shared (symlinked) by blockchain, integration, and document services.
Copy `evault-frontend/.env.example` → `evault-frontend/.env` if you need to override the gateway URL.

---

## Start Order (important — Gateway last)

Open a separate terminal tab for each:

### 1. Auth Service (Port 8081)
```bash
cd evault-auth
./mvnw spring-boot:run
```

### 2. Document Service (Port 8082)
```bash
cd scratch_doc_service
# Root .env is already symlinked; or: cp .env.example .env
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8082 --reload
```

### 3. Blockchain Service (Port 8083)
```bash
cd evault-blockchain
npm install
npm start
```

### 4. Audit Service (Port 8084)
```bash
cd evault-audit
./mvnw spring-boot:run
```

### 5. Notification Service (Port 8085)
```bash
cd evault-notifications
# Optional: export MAIL_USERNAME / MAIL_PASSWORD for real email
./mvnw spring-boot:run
```

### 6. Integration Service (Port 8086)
```bash
cd evault-integration
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8086 --reload
```

### 7. API Gateway (Port 8080) — Start last
```bash
cd evault-gateway
./mvnw spring-boot:run
```

### 8. Frontend (Port 3000)
```bash
cd evault-frontend
cp .env.example .env   # optional
npm install
npm run dev
```

---

## Health Check URLs
| Service            | URL                                              |
|--------------------|--------------------------------------------------|
| Gateway            | http://localhost:8080/actuator/health            |
| Auth               | http://localhost:8081/api/auth/health            |
| Document           | http://localhost:8082/health                     |
| Blockchain         | http://localhost:8083/blockchain/health          |
| Audit              | http://localhost:8084/audit/health               |
| Notifications      | http://localhost:8085/api/notifications/health   |
| Integration        | http://localhost:8086/docs                       |
| Frontend           | http://localhost:3000                            |

All browser API traffic should go through the gateway (`http://localhost:8080`).
