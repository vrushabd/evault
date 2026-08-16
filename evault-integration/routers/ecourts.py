from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional

from services import ecourts_service

router = APIRouter(prefix="/ecourts", tags=["eCourts Case Registry"])


class CaseRegisterRequest(BaseModel):
    caseId: str = Field(..., min_length=3)
    title: Optional[str] = None
    court: Optional[str] = None
    judge: Optional[str] = None
    filingDate: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    petitioner: Optional[str] = None
    respondent: Optional[str] = None
    nextHearing: Optional[str] = None
    caseType: Optional[str] = "Civil"
    lawyerBar: Optional[str] = None
    barNumber: Optional[str] = None
    createdBy: Optional[str] = None


@router.post("/cases")
async def register_case(request: CaseRegisterRequest):
    """Register or update a case in the persistent vault registry."""
    try:
        payload = request.model_dump()
        payload["parties"] = {
            "petitioner": request.petitioner or "",
            "respondent": request.respondent or "",
        }
        case = ecourts_service.register_case(payload)
        return {"success": True, "data": case}
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "error": str(ve)})
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to register case: {str(e)}"},
        )


@router.get("/cases")
async def list_cases():
    """List all registered cases (most recently updated first)."""
    try:
        return {"success": True, "data": ecourts_service.list_all_cases()}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to list cases: {str(e)}"},
        )


@router.get("/case/{case_id}")
async def get_case_details(case_id: str):
    """Return a registered case by ID."""
    try:
        case_data = ecourts_service.get_case_by_id(case_id)
        return {"success": True, "data": case_data}
    except KeyError:
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": f"Case not found: {case_id}. Register it via POST /ecourts/cases or Lawyer Filing.",
            },
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve case: {str(e)}"},
        )


@router.get("/cases/judge/{judge_id}")
async def get_cases_for_judge(judge_id: str):
    """Return cases assigned to a judge (substring match on judge name)."""
    try:
        cases = ecourts_service.get_cases_by_judge(judge_id)
        return {"success": True, "data": cases}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve judge cases: {str(e)}"},
        )


@router.get("/cases/lawyer/{bar_number}")
async def get_cases_for_lawyer(bar_number: str):
    """Return cases linked to a lawyer bar number."""
    try:
        cases = ecourts_service.get_cases_by_lawyer(bar_number)
        return {"success": True, "data": cases}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve lawyer cases: {str(e)}"},
        )


@router.get("/courts")
async def get_courts():
    """Return reference list of Indian courts."""
    try:
        courts = ecourts_service.get_all_courts()
        return {"success": True, "data": courts}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve courts: {str(e)}"},
        )


@router.get("/health")
async def ecourts_health():
    return {
        "success": True,
        "data": {
            "service": "eCourts Case Registry",
            "status": "UP",
            "mockMode": False,
            "storage": "sqlite",
        },
    }
