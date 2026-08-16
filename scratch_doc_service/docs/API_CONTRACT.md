# eVault Document Microservice API Contract

## Base URL
`http://localhost:8082`

## Endpoints

### 1. Upload Document
- **URL**: `/api/documents/upload`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: PDF file (Max 20MB)
  - `caseId`: String
  - `docType`: String
- **Success Response** (200 OK):
  ```json
  {
    "doc_id": "DOC-XXXX",
    "case_id": "CASE-123",
    "doc_type": "AFFIDAVIT",
    "ipfs_cid": "bafy...",
    "version": 1,
    "status": "VERIFIED_BLOCKCHAIN",
    "created_at": "2026-08-14T..."
  }
  ```

### 2. Retrieve Document Content
- **URL**: `/api/documents/{docId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  - **Content-Type**: `application/pdf`
  - Returns the decrypted binary PDF data stream.

### 3. Get Documents by Case
- **URL**: `/api/documents/case/{caseId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  [
    {
      "doc_id": "DOC-XXXX",
      "case_id": "CASE-123",
      ...
    }
  ]
  ```

### 4. Share Document
- **URL**: `/api/documents/share`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "docId": "DOC-XXXX",
    "walletAddress": "0xTargetWallet",
    "expiresAt": null
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "success": true,
    "docId": "DOC-XXXX",
    "walletAddress": "0xTargetWallet",
    "message": "Document shared successfully"
  }
  ```

### 5. Revoke Access
- **URL**: `/api/documents/{docId}`
- **Method**: `DELETE`
- **Success Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Document access revoked"
  }
  ```

### 6. Verify Document
- **URL**: `/api/documents/verify/{docId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  {
    "docId": "DOC-XXXX",
    "verified": true,
    "status": "VERIFIED",
    "ipfsCid": "bafy...",
    "txHash": "0x..."
  }
  ```

### 7. Amend Document (New Version)
- **URL**: `/api/documents/amend/{docId}`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file`: PDF file
- **Success Response** (200 OK):
  Returns updated Document JSON containing incremented `version` and new `ipfs_cid`.

### 8. Get Document Versions
- **URL**: `/api/documents/versions/{docId}`
- **Method**: `GET`
- **Success Response** (200 OK): Array of previous versions.

### 9. Get QR Code Data
- **URL**: `/api/documents/qr/{docId}`
- **Method**: `GET`
- **Success Response** (200 OK):
  ```json
  {
    "docId": "DOC-XXXX",
    "verificationUrl": "http://blockchain-service/verify/DOC-XXXX",
    "txHash": "0x..."
  }
  ```
