import io
import os
import re
import json
import logging
from typing import Dict, Any, Optional
import pdfplumber
import google.generativeai as genai

logger = logging.getLogger("classifier_service")

PROMPT_TEMPLATE = """You are a legal document analyzer for Indian courts.
Extract the following from this legal document text and 
return ONLY a valid JSON object with no markdown:
{{
  'documentType': one of [FIR, Judgment, BailOrder, 
                  Evidence, ChargeSheet, Affidavit, 
                  LegalNotice, Other],
  'caseNumber': string or null,
  'parties': {{
    'petitioner': string or null,
    'respondent': string or null
  }},
  'date': string in YYYY-MM-DD format or null,
  'court': string or null,
  'confidence': float between 0 and 1
}}
Document text: {extracted_text}"""


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts text from PDF bytes using pdfplumber."""
    extracted_pages = []
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_pages.append(text)
    except Exception as e:
        logger.error(f"pdfplumber extraction failed: {e}")
        raise ValueError(f"Failed to parse PDF file: {str(e)}")
    
    full_text = "\n".join(extracted_pages).strip()
    return full_text


def _clean_json_response(raw_response: str) -> str:
    """Strips markdown formatting such as ```json ... ``` from model output."""
    cleaned = raw_response.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
    return cleaned.strip()


def _fallback_classification(text: str) -> Dict[str, Any]:
    """Best-effort heuristic classification when Gemini API is unavailable or fails."""
    text_lower = text.lower()
    
    # Document Type Detection
    doc_type = "Other"
    if "first information report" in text_lower or "f.i.r" in text_lower or " fir " in text_lower or text_lower.startswith("fir"):
        doc_type = "FIR"
    elif "bail order" in text_lower or "bail application" in text_lower:
        doc_type = "BailOrder"
    elif "charge sheet" in text_lower or "chargesheet" in text_lower:
        doc_type = "ChargeSheet"
    elif "judgment" in text_lower or "judgement" in text_lower or "order" in text_lower:
        doc_type = "Judgment"
    elif "affidavit" in text_lower:
        doc_type = "Affidavit"
    elif "legal notice" in text_lower or "notice" in text_lower:
        doc_type = "LegalNotice"
    elif "evidence" in text_lower or "exhibit" in text_lower:
        doc_type = "Evidence"

    # Case Number Regex
    case_match = re.search(r"(?:case|crl|civ|wp|appeal|fir|order)\s*(?:no|number)?[\.\s:]*([A-Z0-9/\-]{4,25})", text, re.IGNORECASE)
    case_number = case_match.group(1).strip() if case_match else None

    # Court Detection
    court = None
    if "supreme court" in text_lower:
        court = "Supreme Court of India"
    elif "mumbai high court" in text_lower or "bombay high court" in text_lower:
        court = "Mumbai High Court"
    elif "delhi high court" in text_lower:
        court = "Delhi High Court"
    elif "karnataka high court" in text_lower:
        court = "Karnataka High Court"
    elif "high court" in text_lower:
        court = "High Court"
    elif "district court" in text_lower:
        court = "District Court"

    # Date Regex (YYYY-MM-DD or DD-MM-YYYY)
    date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if not date_match:
        date_alt = re.search(r"\b(\d{2})[/.-](\d{2})[/.-](\d{4})\b", text)
        date_str = f"{date_alt.group(3)}-{date_alt.group(2)}-{date_alt.group(1)}" if date_alt else None
    else:
        date_str = date_match.group(1)

    # Parties Regex (vs. / versus)
    vs_match = re.search(r"([A-Za-z0-9\.\s]{3,40})\s+(?:vs\.?|versus)\s+([A-Za-z0-9\.\s]{3,40})", text, re.IGNORECASE)
    petitioner = vs_match.group(1).strip() if vs_match else None
    respondent = vs_match.group(2).strip() if vs_match else None

    return {
        "documentType": doc_type,
        "caseNumber": case_number,
        "parties": {
            "petitioner": petitioner,
            "respondent": respondent
        },
        "date": date_str,
        "court": court,
        "confidence": 0.70 if doc_type != "Other" else 0.40
    }


def classify_legal_text(text: str) -> Dict[str, Any]:
    """Classifies legal document text using Gemini 1.5 Flash with fallback logic."""
    raw_text_sample = text[:500]
    extracted_sample = text[:2000]
    
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    
    # If API key is placeholder or empty, use fallback directly
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        logger.info("GEMINI_API_KEY not configured. Using heuristic fallback classifier.")
        result = _fallback_classification(text)
        result["rawText"] = raw_text_sample
        return result

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-flash-latest")
        prompt = PROMPT_TEMPLATE.format(extracted_text=extracted_sample)
        
        response = model.generate_content(prompt)
        cleaned_json_text = _clean_json_response(response.text)
        
        parsed_data = json.loads(cleaned_json_text)
        
        return {
            "documentType": parsed_data.get("documentType", "Other"),
            "caseNumber": parsed_data.get("caseNumber"),
            "parties": {
                "petitioner": parsed_data.get("parties", {}).get("petitioner"),
                "respondent": parsed_data.get("parties", {}).get("respondent")
            },
            "date": parsed_data.get("date"),
            "court": parsed_data.get("court"),
            "confidence": float(parsed_data.get("confidence", 0.85)),
            "rawText": raw_text_sample
        }
    except Exception as e:
        logger.warning(f"Gemini API classification failed: {e}. Falling back to rule-based extraction.")
        fallback = _fallback_classification(text)
        fallback["rawText"] = raw_text_sample
        return fallback
