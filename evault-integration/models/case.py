from typing import Optional
from pydantic import BaseModel, Field


class Party(BaseModel):
    petitioner: Optional[str] = Field(None, description="Petitioner / Complainant name")
    respondent: Optional[str] = Field(None, description="Respondent / Accused name")


class Case(BaseModel):
    caseId: str = Field(..., description="Unique case identifier")
    title: str = Field(..., description="Case title (e.g. State of Maharashtra vs John Doe)")
    court: str = Field(..., description="Court name")
    judge: str = Field(..., description="Assigned judge name")
    filingDate: str = Field(..., description="Date of filing (YYYY-MM-DD)")
    status: str = Field(..., description="Status: ACTIVE, HEARING, RESERVED, DISPOSED, ADJOURNED")
    parties: Party = Field(..., description="Involved parties")
    nextHearing: Optional[str] = Field(None, description="Next hearing date (YYYY-MM-DD)")
    caseType: str = Field(..., description="Type: Criminal, Civil, Constitutional, Family, Motor Accident, Tax")


class Court(BaseModel):
    courtId: str = Field(..., description="Court code identifier")
    name: str = Field(..., description="Full court name")
    state: str = Field(..., description="State jurisdiction")
    type: str = Field(..., description="Court type: Supreme Court, High Court, District Court")
