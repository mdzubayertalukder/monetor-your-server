import asyncio
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.storage.database import (
    init_db,
    record_metric,
    get_recent_errors,
    get_alerts
)
from backend.app.collectors.system_metrics import get_system_metrics
from backend.app.collectors.docker_monitor import get_containers_summary
from backend.app.collectors.log_collector import run_log_scanner
from backend.app.collectors.service_checker import check_all_services
from backend.app.alerts.manager import check_system_thresholds

from backend.app.routes import (
    metrics,
    containers,
    logs,
    services,
    alerts,
    websocket
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("servermon")

# Background task handlers
bg_tasks = []

async def telemetry_background_loop():
    logger.info("Starting telemetry background loop...")
    while True:
        try:
            # 1. Collect system metrics
            metric_data = get_system_metrics()
            
            # 2. Record to DB for historical graphing
            cpu = metric_data["cpu"]["percent"]
            ram = metric_data["memory"]["percent"]
            disk = metric_data["disk"]["overall_percent"]
            tx = metric_data["network"]["tx_rate_kbps"]
            rx = metric_data["network"]["rx_rate_kbps"]
            await record_metric(cpu, ram, disk, tx, rx)
            
            # 3. Check thresholds for alerts
            await check_system_thresholds(metric_data)
            
            # 4. Fetch containers summary & active alerts to broadcast
            if websocket.manager.active_connections:
                containers_data = get_containers_summary()
                active_alerts = await get_alerts(status="ACTIVE", limit=5)
                recent_errors = await get_recent_errors(limit=5)
                
                await websocket.manager.broadcast({
                    "type": "tick",
                    "timestamp": metric_data["timestamp"],
                    "metrics": metric_data,
                    "containers": containers_data,
                    "active_alerts_count": len(active_alerts),
                    "recent_errors": recent_errors,
                    "active_alerts": active_alerts
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in telemetry loop: {e}")
            
        await asyncio.sleep(settings.METRICS_INTERVAL)

async def log_scanner_loop():
    logger.info("Starting log scanner background loop...")
    while True:
        try:
            await run_log_scanner()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in log scanner loop: {e}")
        await asyncio.sleep(5)

async def service_checker_loop():
    logger.info("Starting service checker loop...")
    while True:
        try:
            await check_all_services()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in service checker loop: {e}")
        await asyncio.sleep(15)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("PulseOps Server Monitor initializing...")
    await init_db()
    
    t1 = asyncio.create_task(telemetry_background_loop())
    t2 = asyncio.create_task(log_scanner_loop())
    t3 = asyncio.create_task(service_checker_loop())
    bg_tasks.extend([t1, t2, t3])
    
    yield
    
    # Shutdown
    logger.info("PulseOps Server Monitor shutting down...")
    for t in bg_tasks:
        t.cancel()
    await asyncio.gather(*bg_tasks, return_exceptions=True)

app = FastAPI(
    title=settings.APP_NAME,
    description="Full-stack server, container, and error log monitoring platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health endpoint
@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0"
    }

# Register Routers
app.include_router(metrics.router)
app.include_router(containers.router)
app.include_router(logs.router)
app.include_router(services.router)
app.include_router(alerts.router)
app.include_router(websocket.router)

# Mount frontend static files if built
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Don't intercept API or WS routes
        if full_path.startswith("api") or full_path.startswith("ws"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
