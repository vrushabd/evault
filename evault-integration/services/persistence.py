"""SQLite persistence for integration service (cases + Aadhaar bindings)."""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

_DATA_DIR = Path(os.getenv("EVAULT_INTEGRATION_DATA", Path(__file__).resolve().parent.parent / "data"))
_DB_PATH = _DATA_DIR / "integration.db"


def _ensure_db() -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(_DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS aadhaar_bindings (
                wallet_address TEXT PRIMARY KEY,
                aadhaar_hash TEXT NOT NULL,
                wallet_display TEXT NOT NULL,
                bound_at TEXT NOT NULL
            )
            """
        )
        # Seed standard cases if empty
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM cases")
        if cur.fetchone()[0] == 0:
            seed_cases = [
                {
                    "caseId": "CASE-BR-001",
                    "title": "State of Bihar vs Ramesh Sharma",
                    "court": "District Court Patna, Bihar",
                    "judge": "Hon. Justice S. Mehta",
                    "filingDate": "2024-01-15",
                    "status": "ACTIVE",
                    "parties": {"petitioner": "State of Bihar", "respondent": "Ramesh Sharma"},
                    "caseType": "Criminal",
                    "lawyerBar": "MAH-10492-2020",
                    "createdBy": "Adv. Ramesh Sharma",
                },
                {
                    "caseId": "CASE-MH-001",
                    "title": "Ananya Rao vs State of Maharashtra",
                    "court": "Mumbai High Court, Maharashtra",
                    "judge": "Hon. Justice S. Mehta",
                    "filingDate": "2024-02-10",
                    "status": "ACTIVE",
                    "parties": {"petitioner": "Ananya Rao", "respondent": "State of Maharashtra"},
                    "caseType": "Bail Application",
                    "lawyerBar": "MAH-10492-2020",
                    "createdBy": "Adv. Ramesh Sharma",
                },
                {
                    "caseId": "CASE-DL-001",
                    "title": "TechCorp India vs Union of India",
                    "court": "Delhi High Court, New Delhi",
                    "judge": "Hon. Justice R.K. Sharma",
                    "filingDate": "2024-03-20",
                    "status": "ACTIVE",
                    "parties": {"petitioner": "TechCorp India", "respondent": "Union of India"},
                    "caseType": "Commercial Appeal",
                    "lawyerBar": "DL-9821-2018",
                    "createdBy": "Adv. Vikram Seth",
                },
                {
                    "caseId": "CASE-KA-001",
                    "title": "Bengaluru Metro Project vs Citizen Forum",
                    "court": "Karnataka High Court, Karnataka",
                    "judge": "Hon. Justice N. Kumar",
                    "filingDate": "2024-04-05",
                    "status": "PENDING",
                    "parties": {"petitioner": "Citizen Forum", "respondent": "Bengaluru Metro"},
                    "caseType": "Public Interest Litigation",
                    "lawyerBar": "KA-5512-2015",
                    "createdBy": "Adv. S. Rao",
                },
            ]
            for sc in seed_cases:
                conn.execute(
                    "INSERT INTO cases (case_id, payload, updated_at) VALUES (?, ?, datetime('now'))",
                    (sc["caseId"], json.dumps(sc)),
                )
        conn.commit()


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    _ensure_db()
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def upsert_case(case: Dict[str, Any]) -> Dict[str, Any]:
    case_id = case["caseId"]
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO cases (case_id, payload, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(case_id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = datetime('now')
            """,
            (case_id, json.dumps(case)),
        )
    return case


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    key = (case_id or "").strip()
    if not key:
        return None
    with connect() as conn:
        row = conn.execute(
            "SELECT payload FROM cases WHERE lower(case_id) = lower(?)",
            (key,),
        ).fetchone()
    if not row:
        return None
    return json.loads(row["payload"])


def list_cases() -> List[Dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT payload FROM cases ORDER BY updated_at DESC"
        ).fetchall()
    return [json.loads(r["payload"]) for r in rows]


def save_aadhaar_binding(wallet: str, aadhaar_hash: str, bound_at: str) -> None:
    normalized = wallet.lower()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO aadhaar_bindings (wallet_address, aadhaar_hash, wallet_display, bound_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(wallet_address) DO UPDATE SET
                aadhaar_hash = excluded.aadhaar_hash,
                wallet_display = excluded.wallet_display,
                bound_at = excluded.bound_at
            """,
            (normalized, aadhaar_hash, wallet, bound_at),
        )


def get_aadhaar_binding(wallet: str) -> Optional[Dict[str, Any]]:
    if not wallet:
        return None
    with connect() as conn:
        row = conn.execute(
            "SELECT aadhaar_hash, wallet_display, bound_at FROM aadhaar_bindings WHERE wallet_address = ?",
            (wallet.lower(),),
        ).fetchone()
    if not row:
        return None
    return {
        "aadhaarHash": row["aadhaar_hash"],
        "walletAddress": row["wallet_display"],
        "boundAt": row["bound_at"],
    }


def delete_aadhaar_binding(wallet: str) -> bool:
    if not wallet:
        return False
    with connect() as conn:
        cursor = conn.execute(
            "DELETE FROM aadhaar_bindings WHERE wallet_address = ?",
            (wallet.lower(),),
        )
        return cursor.rowcount > 0
