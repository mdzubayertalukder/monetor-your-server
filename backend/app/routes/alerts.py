from fastapi import APIRouter
from typing import Optional
from backend.app.storage.database import (
    get_alerts, 
    resolve_alert, 
    resolve_all_alerts, 
    clear_all_alerts
)

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
async def list_alerts(status: Optional[str] = None, limit: int = 100):
    alerts = await get_alerts(status=status, limit=limit)
    return alerts

@router.post("/{alert_id}/resolve")
async def resolve_single_alert(alert_id: int):
    await resolve_alert(alert_id)
    return {"success": True, "message": f"Alert {alert_id} acknowledged and resolved"}

@router.post("/resolve-all")
@router.post("/acknowledge-all")
async def acknowledge_all_alerts():
    await resolve_all_alerts()
    return {"success": True, "message": "All active alerts acknowledged and marked resolved"}

@router.delete("")
async def clear_alerts_history():
    await clear_all_alerts()
    return {"success": True, "message": "Alerts archive cleared"}
