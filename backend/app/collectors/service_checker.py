import asyncio
import time
import socket
import httpx
import logging
from datetime import datetime, timezone
import aiosqlite
from backend.app.config import settings
from backend.app.storage.database import log_server_error, create_alert

logger = logging.getLogger(__name__)

async def check_http(url: str, timeout: float = 4.0) -> tuple[bool, int, float, str]:
    """Returns (is_up, status_code, latency_ms, error_msg)"""
    start = time.perf_counter()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "http://" + url
    try:
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            resp = await client.get(url)
            latency = round((time.perf_counter() - start) * 1000, 2)
            is_up = resp.status_code < 500
            err_msg = "" if is_up else f"HTTP Status {resp.status_code}"
            return is_up, resp.status_code, latency, err_msg
    except httpx.TimeoutException:
        latency = round((time.perf_counter() - start) * 1000, 2)
        return False, 0, latency, "Connection Timeout"
    except Exception as e:
        latency = round((time.perf_counter() - start) * 1000, 2)
        return False, 0, latency, str(e)

async def check_tcp(host_port: str, timeout: float = 3.0) -> tuple[bool, int, float, str]:
    """Returns (is_up, status_code=0, latency_ms, error_msg)"""
    start = time.perf_counter()
    parts = host_port.split(":")
    if len(parts) != 2:
        return False, 0, 0, "Invalid host:port format"
    host, port_str = parts[0], parts[1]
    try:
        port = int(port_str)
        loop = asyncio.get_event_loop()
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        await loop.run_in_executor(None, s.connect, (host, port))
        s.close()
        latency = round((time.perf_counter() - start) * 1000, 2)
        return True, 200, latency, ""
    except Exception as e:
        latency = round((time.perf_counter() - start) * 1000, 2)
        return False, 0, latency, str(e)

async def check_all_services():
    try:
        async with aiosqlite.connect(settings.DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM monitored_services")
            services = await cursor.fetchall()
            
            for s in services:
                sid = s['id']
                name = s['name']
                url = s['url']
                stype = s['service_type'] or "HTTP"
                
                if stype.upper() == "TCP":
                    is_up, code, latency, err_msg = await check_tcp(url)
                else:
                    is_up, code, latency, err_msg = await check_http(url)
                    
                total = (s['checks_total'] or 0) + 1
                success = (s['checks_success'] or 0) + (1 if is_up else 0)
                uptime_ratio = round((success / total) * 100, 1)
                new_status = "UP" if is_up else "DOWN"
                now_iso = datetime.now(timezone.utc).isoformat()
                
                # If service went down, record incident
                if not is_up and s['status'] == "UP":
                    await log_server_error(
                        level="CRITICAL",
                        source=f"service:{name}",
                        message=f"Service '{name}' ({url}) is DOWN: {err_msg}",
                        raw_text=f"Check failed at {now_iso}. Error: {err_msg}"
                    )
                    await create_alert(
                        severity="CRITICAL",
                        title=f"Service Down: {name}",
                        message=f"{name} ({url}) is unresponsive: {err_msg}"
                    )
                
                await db.execute("""
                    UPDATE monitored_services
                    SET status = ?, response_time_ms = ?, status_code = ?,
                        last_check = ?, uptime_ratio = ?, checks_total = ?, checks_success = ?
                    WHERE id = ?
                """, (new_status, latency, code, now_iso, uptime_ratio, total, success, sid))
                
            await db.commit()
    except Exception as e:
        logger.error(f"Error checking services: {e}")
