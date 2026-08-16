import hashlib
import random
from typing import List, Dict, Any

COURTS_LIST = [
    {
        "courtId": "CRT-SC-01",
        "name": "Supreme Court of India",
        "state": "New Delhi",
        "type": "Supreme Court"
    },
    {
        "courtId": "CRT-MH-01",
        "name": "Mumbai High Court",
        "state": "Maharashtra",
        "type": "High Court"
    },
    {
        "courtId": "CRT-DL-01",
        "name": "Delhi High Court",
        "state": "Delhi",
        "type": "High Court"
    },
    {
        "courtId": "CRT-KA-01",
        "name": "Karnataka High Court",
        "state": "Karnataka",
        "type": "High Court"
    },
    {
        "courtId": "CRT-TN-01",
        "name": "Madras High Court",
        "state": "Tamil Nadu",
        "type": "High Court"
    },
    {
        "courtId": "CRT-BR-02",
        "name": "District Court Patna",
        "state": "Bihar",
        "type": "District Court"
    },
    {
        "courtId": "CRT-KA-02",
        "name": "District Court Bengaluru",
        "state": "Karnataka",
        "type": "District Court"
    }
]

JUDGES = [
    "Hon. Justice R.K. Sharma",
    "Hon. Justice S. Mehta",
    "Hon. Justice P. Iyer",
    "Hon. Justice A. Gupta"
]

CASE_TYPES = ["Criminal", "Civil", "Constitutional", "Family", "Motor Accident", "Tax"]
STATUSES = ["ACTIVE", "HEARING", "RESERVED", "DISPOSED", "ADJOURNED"]

KNOWN_CASES: Dict[str, Dict[str, Any]] = {
    "CASE-MH-2024-001": {
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
    },
    "CASE-DL-2024-001": {
        "caseId": "CASE-DL-2024-001",
        "title": "M/S TechCorp India vs. Union of India",
        "court": "Delhi High Court",
        "judge": "Hon. Justice S. Mehta",
        "filingDate": "2024-02-10",
        "status": "RESERVED",
        "parties": {
            "petitioner": "M/S TechCorp India",
            "respondent": "Union of India"
        },
        "nextHearing": "2026-08-25",
        "caseType": "Constitutional"
    },
    "CASE-KA-2024-001": {
        "caseId": "CASE-KA-2024-001",
        "title": "Ananya Rao vs. K.V. Venkatesh",
        "court": "Karnataka High Court",
        "judge": "Hon. Justice P. Iyer",
        "filingDate": "2024-03-05",
        "status": "ACTIVE",
        "parties": {
            "petitioner": "Ananya Rao",
            "respondent": "K.V. Venkatesh"
        },
        "nextHearing": "2026-09-02",
        "caseType": "Civil"
    }
}


def _seed_random_for_id(key: str) -> random.Random:
    seed_int = int(hashlib.md5(key.encode('utf-8')).hexdigest()[:8], 16)
    return random.Random(seed_int)


def generate_mock_case(case_id: str) -> Dict[str, Any]:
    if case_id in KNOWN_CASES:
        return KNOWN_CASES[case_id]
    
    rng = _seed_random_for_id(case_id)
    case_type = rng.choice(CASE_TYPES)
    court = rng.choice(COURTS_LIST)["name"]
    judge = rng.choice(JUDGES)
    status = rng.choice(STATUSES)
    
    petitioner_pool = [
        "State of Maharashtra", "Union of India", "Priya Verma",
        "Reliable Infrastructure Ltd", "Suresh Kumar", "Anita Desai"
    ]
    respondent_pool = [
        "Vikram Malhotra", "Global Logistics India", "Department of Revenue",
        "Rajesh Kumar & Bros", "Deepak Verma", "State of Karnataka"
    ]
    
    petitioner = rng.choice(petitioner_pool)
    respondent = rng.choice(respondent_pool)
    title = f"{petitioner} vs. {respondent}"
    
    month = rng.randint(1, 12)
    day = rng.randint(1, 28)
    filing_date = f"2024-{month:02d}-{day:02d}"
    
    next_month = rng.randint(8, 12)
    next_day = rng.randint(1, 28)
    next_hearing = f"2026-{next_month:02d}-{next_day:02d}" if status not in ["DISPOSED"] else None

    return {
        "caseId": case_id,
        "title": title,
        "court": court,
        "judge": judge,
        "filingDate": filing_date,
        "status": status,
        "parties": {
            "petitioner": petitioner,
            "respondent": respondent
        },
        "nextHearing": next_hearing,
        "caseType": case_type
    }


def get_case_by_id(case_id: str) -> Dict[str, Any]:
    """Return a known mock case only. Unknown IDs raise KeyError (404)."""
    key = (case_id or "").strip()
    # Exact match first, then case-insensitive
    if key in KNOWN_CASES:
        return KNOWN_CASES[key]
    for known_id, data in KNOWN_CASES.items():
        if known_id.lower() == key.lower():
            return data
    raise KeyError(f"Case not found: {case_id}")


def get_cases_by_judge(judge_id: str) -> List[Dict[str, Any]]:
    """Return known cases for a judge; empty list if none match."""
    query = (judge_id or "").strip().lower()
    if not query:
        return []
    cases = []
    for cdata in KNOWN_CASES.values():
        if query in cdata["judge"].lower():
            cases.append(cdata)
    return cases


def get_cases_by_lawyer(bar_number: str) -> List[Dict[str, Any]]:
    """
    Return known cases for a lawyer bar number.
    Demo mapping: MAH-10492-2020 → Maharashtra criminal case.
    """
    query = (bar_number or "").strip().upper()
    if not query:
        return []
    # Explicit demo bar → case mapping (SIH demo lawyer)
    BAR_CASES = {
        "MAH-10492-2020": ["CASE-MH-2024-001"],
        "DL-8821-2019": ["CASE-DL-2024-001"],
        "KA-3301-2021": ["CASE-KA-2024-001"],
    }
    case_ids = BAR_CASES.get(query, [])
    return [KNOWN_CASES[cid] for cid in case_ids if cid in KNOWN_CASES]


def get_all_courts() -> List[Dict[str, Any]]:
    return COURTS_LIST
