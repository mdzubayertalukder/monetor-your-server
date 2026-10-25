from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from backend.app.collectors.k8s_monitor import (
    get_k8s_overview,
    get_pod_logs,
    restart_pod,
    scale_deployment
)

router = APIRouter(prefix="/api/k8s", tags=["Kubernetes"])


class ScaleRequest(BaseModel):
    replicas: int = Field(..., ge=0, le=50, description="Desired replicas count")


@router.get("/overview")
async def k8s_overview():
    """Returns cluster telemetry including nodes, pods, deployments, and namespaces."""
    return get_k8s_overview()


@router.get("/status")
async def k8s_status():
    """Returns high-level Kubernetes connection and cluster readiness status."""
    data = get_k8s_overview()
    return {
        "connected": data.get("connected", False),
        "is_mock": data.get("is_mock", True),
        "cluster_name": data.get("cluster_name"),
        "server_version": data.get("server_version"),
        "diagnostics": data.get("diagnostics"),
        "stats": data.get("stats")
    }


@router.get("/pods")
async def list_k8s_pods(
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    status: Optional[str] = Query(None, description="Filter by status (e.g. Running, CrashLoopBackOff)")
):
    """Lists pods filtered optionally by namespace or status."""
    data = get_k8s_overview()
    pods = data.get("pods", [])
    
    if namespace and namespace != "all":
        pods = [p for p in pods if p.get("namespace") == namespace]
    if status and status != "all":
        pods = [p for p in pods if p.get("status") == status]
        
    return {"pods": pods, "total": len(pods)}


@router.get("/pods/{namespace}/{pod_name}/logs")
async def get_k8s_pod_logs(
    namespace: str,
    pod_name: str,
    container: Optional[str] = Query(None, description="Container name within pod"),
    tail: int = Query(200, ge=1, le=1000, description="Number of tail lines"),
    previous: bool = Query(False, description="Fetch logs from previously terminated instance")
):
    """Retrieves standard output / error logs from a specified pod."""
    logs_text = get_pod_logs(namespace=namespace, pod_name=pod_name, container=container, tail_lines=tail, previous=previous)
    return {
        "namespace": namespace,
        "pod_name": pod_name,
        "container": container,
        "tail": tail,
        "previous": previous,
        "logs": logs_text
    }


@router.post("/pods/{namespace}/{pod_name}/restart")
async def restart_k8s_pod(namespace: str, pod_name: str):
    """Terminates pod to trigger recreation by Deployment/ReplicaSet controller."""
    res = restart_pod(namespace=namespace, pod_name=pod_name)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Failed to restart pod"))
    return res


@router.post("/deployments/{namespace}/{deployment_name}/scale")
async def scale_k8s_deployment(
    namespace: str,
    deployment_name: str,
    body: ScaleRequest
):
    """Scales a deployment's desired replica count up or down."""
    res = scale_deployment(namespace=namespace, deployment_name=deployment_name, replicas=body.replicas)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "Failed to scale deployment"))
    return res
