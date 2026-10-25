from fastapi import APIRouter, HTTPException
from backend.app.collectors.docker_monitor import (
    get_containers_summary,
    get_container_logs,
    restart_container,
    stop_container,
    start_container
)

router = APIRouter(prefix="/api/containers", tags=["Containers"])

@router.get("")
async def list_containers():
    return get_containers_summary()

@router.get("/{container_id}/logs")
async def fetch_container_logs(container_id: str, tail: int = 150):
    result = get_container_logs(container_id, tail=tail)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/{container_id}/restart")
async def restart_single_container(container_id: str):
    result = restart_container(container_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to restart"))
    return result

@router.post("/{container_id}/stop")
async def stop_single_container(container_id: str):
    result = stop_container(container_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to stop container"))
    return result

@router.post("/{container_id}/start")
async def start_single_container(container_id: str):
    result = start_container(container_id)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to start container"))
    return result
