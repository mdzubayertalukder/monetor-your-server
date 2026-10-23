import asyncio
import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.collectors.system_metrics import get_system_metrics
from backend.app.collectors.docker_monitor import get_containers_summary
from backend.app.storage.database import get_recent_errors, get_alerts

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, data: dict):
        if not self.active_connections:
            return
        msg = json.dumps(data)
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(msg)
            except Exception:
                disconnected.add(connection)
        for dead in disconnected:
            self.active_connections.discard(dead)

manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial state immediately
        metrics = get_system_metrics()
        containers = get_containers_summary()
        errors = await get_recent_errors(limit=10)
        alerts = await get_alerts(status="ACTIVE", limit=10)
        
        await websocket.send_text(json.dumps({
            "type": "initial_state",
            "metrics": metrics,
            "containers": containers,
            "recent_errors": errors,
            "active_alerts": alerts
        }))
        
        # Keep socket open and handle incoming messages (e.g. ping)
        while True:
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
