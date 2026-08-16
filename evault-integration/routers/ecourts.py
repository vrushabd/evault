from fastapi import APIRouter
from fastapi.responses import JSONResponse
from services import ecourts_service

router = APIRouter(prefix="/ecourts", tags=["eCourts Mock"])


@router.get("/case/{case_id}")
async def get_case_details(case_id: str):
    """Returns mock case details for a known case ID (404 if unknown)."""
    try:
        case_data = ecourts_service.get_case_by_id(case_id)
        return {
            "success": True,
            "data": case_data
        }
    except KeyError:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": f"Case not found: {case_id}. Try CASE-MH-2024-001, CASE-DL-2024-001, or CASE-KA-2024-001."}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve case: {str(e)}"}
        )


@router.get("/cases/judge/{judge_id}")
async def get_cases_for_judge(judge_id: str):
    """Returns list of cases assigned to a judge."""
    try:
        cases = ecourts_service.get_cases_by_judge(judge_id)
        return {
            "success": True,
            "data": cases
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve judge cases: {str(e)}"}
        )


@router.get("/cases/lawyer/{bar_number}")
async def get_cases_for_lawyer(bar_number: str):
    """Returns list of cases assigned to a lawyer bar number."""
    try:
        cases = ecourts_service.get_cases_by_lawyer(bar_number)
        return {
            "success": True,
            "data": cases
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve lawyer cases: {str(e)}"}
        )


@router.get("/courts")
async def get_courts():
    """Returns list of Indian courts."""
    try:
        courts = ecourts_service.get_all_courts()
        return {
            "success": True,
            "data": courts
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Failed to retrieve courts: {str(e)}"}
        )


@router.get("/health")
async def ecourts_health():
    """Returns health status of the eCourts mock module."""
    return {
        "success": True,
        "data": {
            "service": "eCourts Mock API",
            "status": "UP",
            "mockMode": True
        }
    }
