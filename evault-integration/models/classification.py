from typing import Optional
from pydantic import BaseModel, Field


class Parties(BaseModel):
    petitioner: Optional[str] = Field(None, description="Petitioner name")
    respondent: Optional[str] = Field(None, description="Respondent name")


class ClassificationResult(BaseModel):
    documentType: str = Field(..., description="Document type: FIR, Judgment, BailOrder, Evidence, ChargeSheet, Affidavit, LegalNotice, Other")
    caseNumber: Optional[str] = Field(None, description="Extracted case number")
    parties: Parties = Field(default_factory=Parties, description="Extracted parties")
    date: Optional[str] = Field(None, description="Document date YYYY-MM-DD")
    court: Optional[str] = Field(None, description="Extracted court name")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")
    rawText: Optional[str] = Field(None, description="First 500 characters of raw text")


class TextClassifyRequest(BaseModel):
    text: str = Field(..., description="Legal document text to analyze")
