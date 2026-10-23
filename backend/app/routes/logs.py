from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from backend.app.storage.database import (
    get_recent_errors,
    log_server_error,
    resolve_error,
    clear_all_errors,
    create_alert
)

router = APIRouter(prefix="/api/logs", tags=["Logs & Errors"])

class TestErrorRequest(BaseModel):
    level: str = "ERROR"
    source: str = "simulation:web-service"
    message: str = "Unhandled Exception: Database connection pool exhausted on port 3306"
    raw_text: Optional[str] = "Traceback (most recent call last):\n  File 'app/server.py', line 142 in connect\nOperationalError: (2003, \"Can't connect to MySQL server\")"

@router.get("/errors")
async def list_errors(
    limit: int = 50,
    level: Optional[str] = None,
    source: Optional[str] = None,
    search: Optional[str] = None
):
    errors = await get_recent_errors(limit=limit, level=level, source=source, search=search)
    return {"errors": errors, "total": len(errors)}

@router.post("/test-error")
async def trigger_test_error(payload: TestErrorRequest):
    err_id = await log_server_error(
        level=payload.level,
        source=payload.source,
        message=payload.message,
        raw_text=payload.raw_text or payload.message
    )
    if payload.level.upper() in ("CRITICAL", "ERROR"):
        await create_alert(
            severity=payload.level.upper(),
            title=f"Manual Error Triggered ({payload.source})",
            message=payload.message
        )
    return {"success": True, "error_id": err_id, "message": "Test error recorded successfully"}

@router.post("/{error_id}/resolve")
async def mark_error_resolved(error_id: int):
    await resolve_error(error_id)
    return {"success": True, "message": f"Error {error_id} resolved"}

@router.delete("")
async def clear_logs():
    await clear_all_errors()
    return {"success": True, "message": "All error logs cleared"}
