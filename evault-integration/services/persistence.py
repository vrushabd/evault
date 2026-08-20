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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                service TEXT DEFAULT 'Auth',
                hash TEXT,
                block_number TEXT,
                status TEXT DEFAULT 'VERIFIED',
                user_label TEXT,
                user_name TEXT,
                role TEXT,
                performed_by TEXT,
                details TEXT,
                doc_id TEXT,
                case_id TEXT
            )
            """
        )
        # Table initialized clean - cases are created dynamically by Lawyers and Police
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


# ── Audit Log Persistence ───────────────────────────────────────────────

def insert_audit_log(log: Dict[str, Any]) -> Dict[str, Any]:
    """Insert a single audit log entry. Silently skips duplicates."""
    log_id = log.get("id", "")
    if not log_id:
        return log
    with connect() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO audit_logs
                (id, timestamp, action, service, hash, block_number, status,
                 user_label, user_name, role, performed_by, details, doc_id, case_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                log_id,
                log.get("timestamp", ""),
                log.get("action", "UNKNOWN"),
                log.get("service", "Auth"),
                log.get("hash", ""),
                log.get("blockNumber") or log.get("block_number", ""),
                log.get("status", "VERIFIED"),
                log.get("user", ""),
                log.get("userName") or log.get("user_name", ""),
                log.get("role", ""),
                log.get("performedBy") or log.get("performed_by", ""),
                log.get("details", ""),
                log.get("docId") or log.get("doc_id"),
                log.get("caseId") or log.get("case_id"),
            ),
        )
    return log


def list_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    """Return audit logs ordered most-recent-first."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?",
            (limit,),
        ).fetchall()
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "action": r["action"],
            "service": r["service"],
            "hash": r["hash"],
            "blockNumber": r["block_number"],
            "status": r["status"],
            "user": r["user_label"],
            "userName": r["user_name"],
            "role": r["role"],
            "performedBy": r["performed_by"],
            "details": r["details"],
            "docId": r["doc_id"],
            "caseId": r["case_id"],
        })
    return result
