import time
import logging
from typing import Dict, Any
from backend.app.config import settings
from backend.app.storage.database import create_alert, log_server_error
from backend.app.alerts.notifiers import dispatch_notification

logger = logging.getLogger(__name__)

# Debounce tracker: alert_type -> last_triggered_epoch
last_alert_times: Dict[str, float] = {}
ALERT_COOLDOWN_SECONDS = 300  # 5 minutes cooldown per alert type

async def check_system_thresholds(metrics: Dict[str, Any]):
    current_time = time.time()
    
    cpu_percent = metrics.get("cpu", {}).get("percent", 0)
    ram_percent = metrics.get("memory", {}).get("percent", 0)
    disk_percent = metrics.get("disk", {}).get("overall_percent", 0)
    
    # CPU Alert
    if cpu_percent >= settings.ALERT_CPU_THRESHOLD:
        if current_time - last_alert_times.get("high_cpu", 0) > ALERT_COOLDOWN_SECONDS:
            last_alert_times["high_cpu"] = current_time
            title = f"High CPU Usage Warning: {cpu_percent}%"
            msg = f"Host CPU usage has breached threshold of {settings.ALERT_CPU_THRESHOLD}% (Current: {cpu_percent}%)"
            await create_alert("WARNING" if cpu_percent < 95 else "CRITICAL", title, msg)
            await log_server_error("WARNING" if cpu_percent < 95 else "CRITICAL", "host:cpu", msg)
            await dispatch_notification(title, msg, "WARNING" if cpu_percent < 95 else "CRITICAL")
            
    # RAM Alert
    if ram_percent >= settings.ALERT_RAM_THRESHOLD:
        if current_time - last_alert_times.get("high_ram", 0) > ALERT_COOLDOWN_SECONDS:
            last_alert_times["high_ram"] = current_time
            title = f"High Memory Alert: {ram_percent}%"
            msg = f"Host RAM usage has breached threshold of {settings.ALERT_RAM_THRESHOLD}% (Current: {ram_percent}%)"
            await create_alert("CRITICAL", title, msg)
            await log_server_error("CRITICAL", "host:memory", msg)
            await dispatch_notification(title, msg, "CRITICAL")
            
    # Disk Alert
    if disk_percent >= settings.ALERT_DISK_THRESHOLD:
        if current_time - last_alert_times.get("high_disk", 0) > ALERT_COOLDOWN_SECONDS:
            last_alert_times["high_disk"] = current_time
            title = f"Disk Space Critical: {disk_percent}% Full"
            msg = f"Server storage volume reached {disk_percent}% capacity (Threshold: {settings.ALERT_DISK_THRESHOLD}%)"
            await create_alert("CRITICAL", title, msg)
            await log_server_error("CRITICAL", "host:disk", msg)
            await dispatch_notification(title, msg, "CRITICAL")
