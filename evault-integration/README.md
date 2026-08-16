# eVault Integration Service (Port 8086)

The **Integration Service** is a key microservice in the **eVault** architecture (SIH 2026 Problem Statement: SIH260229, Ministry of Law and Justice). It provides three core capabilities:

1. **Mock eCourts API**: Simulates India's national court case management system (Supreme Court, High Courts, District Courts).
2. **AI Document Classifier**: Extracts text from uploaded legal PDFs using `pdfplumber` and performs AI metadata extraction using Google Gemini 1.5 Flash (`gemini-1.5-flash`).
3. **Aadhaar Identity Binding**: Hashes 12-digit Aadhaar numbers with SHA-256 and securely binds them in-memory to Web3 Ethereum wallet addresses.

---

## 🛠️ Tech Stack

- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Default Port**: 8086
- **Libraries**: `pdfplumber`, `google-generativeai`, `python-multipart`, `httpx`, `python-dotenv`, `pydantic`

---

## 📁 File Structure

```
evault-integration/
  ├── main.py                    # FastAPI application entry point & logging middleware
  ├── routers/
  │   ├── ecourts.py             # eCourts mock REST endpoints
  │   ├── classifier.py          # AI document classification endpoints
  │   └── aadhaar.py             # Aadhaar identity binding mock endpoints
  ├── services/
  │   ├── ecourts_service.py     # Mock court data generator and case lookup
  │   ├── classifier_service.py  # pdfplumber OCR & Gemini 1.5 Flash logic (with heuristic fallback)
  │   └── aadhaar_service.py     # Aadhaar format validation, SHA-256 hashing & memory store
  ├── models/
  │   ├── case.py                # Pydantic models for case & court entities
  │   ├── classification.py      # Pydantic models for classifier request/response
  │   └── aadhaar.py             # Pydantic models for Aadhaar binding & verification
  ├── .env.example
  ├── .env
  ├── requirements.txt
  └── README.md
```

---

## 🚀 Setup & Installation

### 1. Create Virtual Environment & Install Dependencies

```bash
cd evault-integration
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` or update `.env`:

```env
PORT=8086
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

> **How to get a Gemini API Key**:
> 1. Visit [Google AI Studio](https://aistudio.google.com/).
> 2. Sign in with your Google account.
> 3. Click **Get API key** and copy your free key into `.env`.
> *(Note: If `GEMINI_API_KEY` is omitted, the service gracefully falls back to an built-in heuristic legal document classifier).*

### 3. Run the Microservice

```bash
uvicorn main:app --reload --port 8086
```

Interactive Swagger API docs are available at: [http://localhost:8086/docs](http://localhost:8086/docs)

---

## 📡 REST API Documentation & cURL Examples

All responses adhere to the standard JSON structure:
- **Success**: `{ "success": true, "data": { ... } }`
- **Error**: `{ "success": false, "error": "message" }`

---

### 🏛️ 1. eCourts Mock Endpoints

#### `GET /ecourts/case/{case_id}`
Returns case details for pre-configured or dynamic case IDs.
- Pre-configured examples: `CASE-MH-2024-001`, `CASE-DL-2024-001`, `CASE-KA-2024-001`.

```bash
curl -X GET http://localhost:8086/ecourts/case/CASE-MH-2024-001
```

**Response**:
```json
{
  "success": true,
  "data": {
    "caseId": "CASE-MH-2024-001",
    "title": "State of Maharashtra vs. Ramesh Sharma",
    "court": "Mumbai High Court",
    "judge": "Hon. Justice R.K. Sharma",
    "filingDate": "2024-01-15",
    "status": "HEARING",
    "parties": {
      "petitioner": "State of Maharashtra",
      "respondent": "Ramesh Sharma"
    },
    "nextHearing": "2026-09-10",
    "caseType": "Criminal"
  }
}
```

#### `GET /ecourts/cases/judge/{judge_id}`
Returns assigned cases for a given judge.

```bash
curl -X GET "http://localhost:8086/ecourts/cases/judge/Hon.%20Justice%20R.K.%20Sharma"
```

#### `GET /ecourts/cases/lawyer/{bar_number}`
Returns cases for a lawyer by Bar council registration number.

```bash
curl -X GET http://localhost:8086/ecourts/cases/lawyer/MAH-10492-2020
```

#### `GET /ecourts/courts`
Returns list of Indian courts.

```bash
curl -X GET http://localhost:8086/ecourts/courts
```

#### `GET /ecourts/health`
Returns health status of the eCourts module.

```bash
curl -X GET http://localhost:8086/ecourts/health
```

---

### 📄 2. AI Document Classifier Endpoints

#### `POST /classify/document`
Accepts `multipart/form-data` with a legal PDF file. Extracts text via `pdfplumber` and analyzes metadata using Gemini 1.5 Flash.

```bash
curl -X POST http://localhost:8086/classify/document \
  -F "file=@/path/to/sample_fir.pdf"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "documentType": "FIR",
    "caseNumber": "FIR-2024-8819",
    "parties": {
      "petitioner": "State of Maharashtra",
      "respondent": "Vikram Singh"
    },
    "date": "2024-02-14",
    "court": "Mumbai High Court",
    "confidence": 0.95,
    "rawText": "FIRST INFORMATION REPORT... State of Maharashtra vs Vikram Singh..."
  }
}
```

#### `POST /classify/text`
Accepts JSON raw legal document text string (useful for fast testing without PDF upload).

```bash
curl -X POST http://localhost:8086/classify/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "IN THE HIGH COURT OF DELHI AT NEW DELHI. CASE NO: WP-2024-9912. M/S Alpha Ltd vs Union of India. Dated: 2024-05-10."
  }'
```

---

### 🆔 3. Aadhaar Identity Binding Mock Endpoints

#### `POST /aadhaar/bind`
Binds a 12-digit Aadhaar number to an Ethereum wallet address by storing the SHA-256 hash in memory. Never returns or stores raw Aadhaar.

```bash
curl -X POST http://localhost:8086/aadhaar/bind \
  -H "Content-Type: application/json" \
  -d '{
    "aadhaarNumber": "998877665544",
    "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "aadhaarHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "walletAddress": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "boundAt": "2026-08-15T21:20:00Z"
  }
}
```

#### `GET /aadhaar/verify/{wallet_address}`
Checks whether a wallet address has a bound Aadhaar identity.

```bash
curl -X GET http://localhost:8086/aadhaar/verify/0x71C7656EC7ab88b098defB751B7401B5f6d8976F
```

**Response**:
```json
{
  "success": true,
  "data": {
    "wallet": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "isBound": true,
    "boundAt": "2026-08-15T21:20:00Z"
  }
}
```
