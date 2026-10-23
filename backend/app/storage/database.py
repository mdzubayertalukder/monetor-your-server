import aiosqlite
import os
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from backend.app.config import settings

async def get_db():
    os.makedirs(os.path.dirname(os.path.abspath(settings.DB_PATH)), exist_ok=True)
    db = await aiosqlite.connect(settings.DB_PATH)
    db.row_factory = aiosqlite.Row
    return db

async def init_db():
    os.makedirs(os.path.dirname(os.path.abspath(settings.DB_PATH)), exist_ok=True)
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS metrics_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                cpu_percent REAL,
                ram_percent REAL,
                disk_percent REAL,
                net_sent_bytes REAL,
                net_recv_bytes REAL
            )
        """)
        
        await db.execute("""
            CREATE TABLE IF NOT EXISTS server_errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                level TEXT NOT NULL,
                source TEXT NOT NULL,
                message TEXT NOT NULL,
                raw_text TEXT,
                resolved INTEGER DEFAULT 0
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS monitored_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                service_type TEXT DEFAULT 'HTTP',
                status TEXT DEFAULT 'UNKNOWN',
                response_time_ms REAL DEFAULT 0,
                status_code INTEGER DEFAULT 0,
                last_check TEXT,
                uptime_ratio REAL DEFAULT 100.0,
                checks_total INTEGER DEFAULT 0,
                checks_success INTEGER DEFAULT 0
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                status TEXT DEFAULT 'ACTIVE',
                resolved_at TEXT
            )
        """)

        # Insert default monitored services if none exist
        cursor = await db.execute("SELECT COUNT(*) FROM monitored_services")
        count = (await cursor.fetchone())[0]
        if count == 0:
            default_services = [
                ("Local Server Host", "http://127.0.0.1:8088/api/health", "HTTP"),
                ("Google DNS", "8.8.8.8:53", "TCP"),
                ("Cloudflare DNS", "1.1.1.1:53", "TCP")
            ]
            for name, url, stype in default_services:
                await db.execute("""
                    INSERT INTO monitored_services (name, url, service_type, status, last_check)
                    VALUES (?, ?, ?, 'PENDING', ?)
                """, (name, url, stype, datetime.now(timezone.utc).isoformat()))
        
        await db.commit()

# Helper queries
async def record_metric(cpu: float, ram: float, disk: float, net_sent: float, net_recv: float):
    now_iso = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("""
            INSERT INTO metrics_history (timestamp, cpu_percent, ram_percent, disk_percent, net_sent_bytes, net_recv_bytes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now_iso, cpu, ram, disk, net_sent, net_recv))
        # Keep only the last 300 points in DB
        await db.execute("""
            DELETE FROM metrics_history WHERE id NOT IN (
                SELECT id FROM metrics_history ORDER BY id DESC LIMIT 300
            )
        """)
        await db.commit()

async def get_metrics_history(limit: int = 60) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("""
            SELECT * FROM metrics_history ORDER BY id DESC LIMIT ?
        """, (limit,))
        rows = await cursor.fetchall()
        return [dict(r) for r in reversed(rows)]

async def log_server_error(level: str, source: str, message: str, raw_text: str = "") -> int:
    now_iso = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.DB_PATH) as db:
        cursor = await db.execute("""
            INSERT INTO server_errors (timestamp, level, source, message, raw_text, resolved)
            VALUES (?, ?, ?, ?, ?, 0)
        """, (now_iso, level.upper(), source, message, raw_text))
        await db.commit()
        return cursor.lastrowid

async def get_recent_errors(limit: int = 50, level: Optional[str] = None, source: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = "SELECT * FROM server_errors WHERE 1=1"
        params = []
        if level:
            query += " AND level = ?"
            params.append(level.upper())
        if source:
            query += " AND source LIKE ?"
            params.append(f"%{source}%")
        if search:
            query += " AND (message LIKE ? OR raw_text LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%"])
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

async def resolve_error(error_id: int):
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("UPDATE server_errors SET resolved = 1 WHERE id = ?", (error_id,))
        await db.commit()

async def clear_all_errors():
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("DELETE FROM server_errors")
        await db.commit()

async def create_alert(severity: str, title: str, message: str) -> int:
    now_iso = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.DB_PATH) as db:
        # Check if an active alert with same title already exists in the last 5 minutes to avoid spamming
        cursor = await db.execute("""
            SELECT id FROM alerts WHERE title = ? AND status = 'ACTIVE' LIMIT 1
        """, (title,))
        existing = await cursor.fetchone()
        if existing:
            return existing[0]
            
        cursor = await db.execute("""
            INSERT INTO alerts (timestamp, severity, title, message, status)
            VALUES (?, ?, ?, ?, 'ACTIVE')
        """, (now_iso, severity.upper(), title, message))
        await db.commit()
        return cursor.lastrowid

async def get_alerts(status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(settings.DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        query = "SELECT * FROM alerts"
        params = []
        if status:
            query += " WHERE status = ?"
            params.append(status.upper())
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        cursor = await db.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]

async def resolve_alert(alert_id: int):
    now_iso = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("UPDATE alerts SET status = 'RESOLVED', resolved_at = ? WHERE id = ?", (now_iso, alert_id))
        await db.commit()

async def resolve_all_alerts():
    now_iso = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("UPDATE alerts SET status = 'RESOLVED', resolved_at = ? WHERE status = 'ACTIVE'", (now_iso,))
        await db.commit()

async def clear_all_alerts():
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.execute("DELETE FROM alerts")
        await db.commit()
