import os
import sys
import io
from fastapi.testclient import TestClient

# Ensure root directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert data["data"]["status"] == "RUNNING"


def test_ecourts_health():
    response = client.get("/ecourts/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] == "UP"


def test_ecourts_case_known():
    response = client.get("/ecourts/case/CASE-MH-2024-001")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["caseId"] == "CASE-MH-2024-001"
    assert data["data"]["court"] == "Mumbai High Court"
    assert data["data"]["caseType"] == "Criminal"


def test_ecourts_case_unknown():
    response = client.get("/ecourts/case/CASE-UNKNOWN-999")
    assert response.status_code == 404
    data = response.json()
    assert data["success"] is False
    assert "not found" in data["error"].lower()


def test_ecourts_courts():
    response = client.get("/ecourts/courts")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert len(data["data"]) >= 5


def test_aadhaar_bind_and_verify():
    test_wallet = "0x1234567890abcdef1234567890abcdef12345678"
    bind_payload = {
        "aadhaarNumber": "234567890124",  # Mathematically valid Verhoeff number
        "walletAddress": test_wallet
    }
    
    # 1. Bind
    response = client.post("/aadhaar/bind", json=bind_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "aadhaarHash" in data["data"]
    assert data["data"]["walletAddress"] == test_wallet
    
    # 2. Verify bound wallet
    response = client.get(f"/aadhaar/verify/{test_wallet}")
    assert response.status_code == 200
    v_data = response.json()
    assert v_data["success"] is True
    assert v_data["data"]["isBound"] is True
    assert v_data["data"]["boundAt"] is not None

    # 3. Verify unbound wallet
    unbound_wallet = "0x0000000000000000000000000000000000000000"
    response = client.get(f"/aadhaar/verify/{unbound_wallet}")
    assert response.status_code == 200
    u_data = response.json()
    assert u_data["success"] is True
    assert u_data["data"]["isBound"] is False


def test_aadhaar_otp_flow():
    test_wallet = "0x9876543210fedcba9876543210fedcba98765432"
    otp_payload = {
        "aadhaarNumber": "583920184751",  # Valid Verhoeff number
        "walletAddress": test_wallet
    }
    
    # 1. Send OTP
    send_resp = client.post("/aadhaar/send-otp", json=otp_payload)
    assert send_resp.status_code == 200
    send_data = send_resp.json()
    assert send_data["success"] is True
    txn_id = send_data["data"]["txnId"]
    demo_otp = send_data["data"]["demoOtp"]
    assert len(demo_otp) == 6

    # 2. Verify OTP
    verify_resp = client.post("/aadhaar/verify-otp", json={
        "txnId": txn_id,
        "otp": demo_otp,
        "walletAddress": test_wallet
    })
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["success"] is True
    assert v_data["data"]["isBound"] is True


def test_aadhaar_bind_invalid_format():
    invalid_payload = {
        "aadhaarNumber": "123456789012", # Fails Verhoeff checksum & starts with 1
        "walletAddress": "0x1234"
    }
    response = client.post("/aadhaar/bind", json=invalid_payload)
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert "Invalid Aadhaar" in data["error"]


def test_classify_text():
    text_payload = {
        "text": "FIRST INFORMATION REPORT. State of Maharashtra vs Ramesh Sharma. Case No: FIR-2024-101. Date: 2024-01-15. Mumbai High Court."
    }
    response = client.post("/classify/text", json=text_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "documentType" in data["data"]
    assert data["data"]["documentType"] in ["FIR", "Judgment", "BailOrder", "Evidence", "ChargeSheet", "Affidavit", "LegalNotice", "Other"]


if __name__ == "__main__":
    print("Running automated tests for eVault Integration Service...")
    test_root()
    test_ecourts_health()
    test_ecourts_case_known()
    test_ecourts_case_dynamic()
    test_ecourts_courts()
    test_aadhaar_bind_and_verify()
    test_aadhaar_bind_invalid_format()
    test_classify_text()
    print("ALL TESTS PASSED SUCCESSFULLY!")
