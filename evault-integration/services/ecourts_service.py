"""Case registry backed by SQLite. Courts list is static reference data (real institutions)."""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from services import persistence

COURTS_LIST = [
    {"courtId": "CRT-SC-01", "name": "Supreme Court of India", "state": "New Delhi", "type": "Supreme Court"},
    {"courtId": "CRT-MH-01", "name": "Mumbai High Court", "state": "Maharashtra", "type": "High Court"},
    {"courtId": "CRT-DL-01", "name": "Delhi High Court", "state": "Delhi", "type": "High Court"},
    {"courtId": "CRT-KA-01", "name": "Karnataka High Court", "state": "Karnataka", "type": "High Court"},
    {"courtId": "CRT-TN-01", "name": "Madras High Court", "state": "Tamil Nadu", "type": "High Court"},
    {"courtId": "CRT-BR-02", "name": "District Court Patna", "state": "Bihar", "type": "District Court"},
    {"courtId": "CRT-KA-02", "name": "District Court Bengaluru", "state": "Karnataka", "type": "District Court"},
]


def _normalize_case(payload: Dict[str, Any]) -> Dict[str, Any]:
    parties = payload.get("parties") or {}
    if isinstance(parties, dict):
        parties_out = {
            "petitioner": parties.get("petitioner") or parties.get("Petitioner") or "",
            "respondent": parties.get("respondent") or parties.get("Respondent") or "",
        }
    else:
        parties_out = {"petitioner": "", "respondent": ""}

    case_id = str(payload.get("caseId") or payload.get("case_id") or "").strip()
    if not case_id:
        raise ValueError("caseId is required")

    return {
        "caseId": case_id,
        "title": str(payload.get("title") or f"Case {case_id}").strip(),
        "court": str(payload.get("court") or "Unassigned Court").strip(),
        "judge": str(payload.get("judge") or "").strip(),
        "filingDate": str(payload.get("filingDate") or date.today().isoformat()),
        "status": str(payload.get("status") or "ACTIVE").upper(),
        "parties": parties_out,
        "nextHearing": payload.get("nextHearing"),
        "caseType": str(payload.get("caseType") or "Civil").strip(),
        "lawyerBar": str(payload.get("lawyerBar") or payload.get("barNumber") or "").strip() or None,
        "createdBy": payload.get("createdBy"),
    }


def register_case(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update a case in the persistent registry."""
    case = _normalize_case(payload)
    existing = persistence.get_case(case["caseId"])
    if existing:
        # Merge non-empty fields onto existing record
        merged = {**existing}
        for key, value in case.items():
            if value not in (None, "", {"petitioner": "", "respondent": ""}):
                merged[key] = value
        case = _normalize_case(merged)
    return persistence.upsert_case(case)


def ensure_case(
    case_id: str,
    *,
    title: Optional[str] = None,
    court: Optional[str] = None,
    judge: Optional[str] = None,
    lawyer_bar: Optional[str] = None,
    created_by: Optional[str] = None,
) -> Dict[str, Any]:
    existing = persistence.get_case(case_id)
    if existing:
        return existing
    return register_case(
        {
            "caseId": case_id,
            "title": title or f"Case {case_id}",
            "court": court or "Registered via eVault",
            "judge": judge or "",
            "filingDate": date.today().isoformat(),
            "status": "ACTIVE",
            "parties": {"petitioner": "", "respondent": ""},
            "caseType": "Civil",
            "lawyerBar": lawyer_bar,
            "createdBy": created_by,
        }
    )


def get_case_by_id(case_id: str) -> Dict[str, Any]:
    data = persistence.get_case(case_id)
    if not data:
        raise KeyError(f"Case not found: {case_id}")
    return data


def list_all_cases() -> List[Dict[str, Any]]:
    return persistence.list_cases()


def get_cases_by_judge(judge_id: str) -> List[Dict[str, Any]]:
    query = (judge_id or "").strip().lower()
    if not query:
        return []
    return [
        c for c in persistence.list_cases()
        if query in str(c.get("judge") or "").lower()
    ]


def get_cases_by_lawyer(bar_number: str) -> List[Dict[str, Any]]:
    query = (bar_number or "").strip().upper()
    if not query:
        return []
    return [
        c for c in persistence.list_cases()
        if str(c.get("lawyerBar") or "").upper() == query
    ]


def get_all_courts() -> List[Dict[str, Any]]:
    return COURTS_LIST
