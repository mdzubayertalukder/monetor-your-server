from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import aiosqlite
from backend.app.config import settings
from backend.app.collectors.service_checker import check_all_services

router = APIRouter(prefix="/api/services", tags=["Services"])

class ServiceCreateRequest(BaseModel):
    name: str
    url: str
    service_type: str = "HTTP"

@router.get("")
async def list_monitored_services():
    async with aiosqlite.connect(settings.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM monitored_services ORDER BY id DESC")
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

@router.post("")
async def create_service(payload: ServiceCreateRequest):
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute("""
            INSERT INTO monitored_services (name, url, service_type, status)
            VALUES (?, ?, ?, 'PENDING')
        """, (payload.name, payload.url, payload.service_type.upper()))
        await db.commit()
        sid = cursor.lastrowid
    
    # Trigger an immediate check
    await check_all_services()
    return {"success": True, "id": sid, "message": f"Service {payload.name} added"}

@router.delete("/{service_id}")
async def delete_service(service_id: int):
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("DELETE FROM monitored_services WHERE id = ?", (service_id,))
        await db.commit()
    return {"success": True, "message": "Service removed"}

@router.post("/check")
async def trigger_services_check():
    await check_all_services()
    return {"success": True, "message": "Services checked"}
