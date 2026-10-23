from fastapi import APIRouter
from backend.app.collectors.system_metrics import get_system_metrics, get_top_processes
from backend.app.storage.database import get_metrics_history

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

@router.get("/current")
async def get_current_metrics():
    metrics = get_system_metrics()
    return metrics

@router.get("/history")
async def get_historical_metrics(limit: int = 60):
    history = await get_metrics_history(limit=limit)
    return history

@router.get("/processes")
async def get_processes(limit: int = 15):
    return get_top_processes(limit=limit)
