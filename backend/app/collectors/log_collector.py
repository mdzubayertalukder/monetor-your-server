import os
import re
import glob
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from backend.app.config import settings
from backend.app.storage.database import log_server_error, create_alert
from backend.app.collectors.docker_monitor import get_docker_client

logger = logging.getLogger(__name__)

# Keep track of file offsets so we only read new lines
file_positions: Dict[str, int] = {}
seen_docker_log_hashes: set = set()

# Regex patterns for error detection
ERROR_PATTERNS = [
    (re.compile(r'\b(CRITICAL|FATAL|EMERGENCY|PANIC|OOM|Out of Memory)\b', re.IGNORECASE), "CRITICAL"),
    (re.compile(r'\b(ERROR|FAIL|FAILED|FAILURE|EXCEPTION|Traceback)\b', re.IGNORECASE), "ERROR"),
    (re.compile(r'\b(WARN|WARNING|DEPRECATED)\b', re.IGNORECASE), "WARNING"),
]

def parse_log_line(line: str) -> tuple[str, str]:
    """Returns (level, clean_message)"""
    for regex, level in ERROR_PATTERNS:
        if regex.search(line):
            return level, line.strip()
    return "INFO", line.strip()

async def scan_file_logs():
    """Tails host log files specified in settings.LOG_PATHS"""
    log_paths = [p.strip() for p in settings.LOG_PATHS.split(",") if p.strip()]
    
    for pattern in log_paths:
        for file_path in glob.glob(pattern):
            if not os.path.exists(file_path) or not os.path.isfile(file_path):
                continue
            try:
                current_size = os.path.getsize(file_path)
                last_pos = file_positions.get(file_path, None)

                # First time reading: start from last 10KB to avoid reading huge gigabyte files
                if last_pos is None:
                    last_pos = max(0, current_size - 10240)
                    file_positions[file_path] = last_pos
                    
                if current_size < last_pos:
                    # File was rotated/truncated
                    last_pos = 0

                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    f.seek(last_pos)
                    lines = f.readlines()
                    file_positions[file_path] = f.tell()

                for line in lines:
                    level, msg = parse_log_line(line)
                    if level in ("ERROR", "CRITICAL"):
                        await log_server_error(
                            level=level,
                            source=f"file:{os.path.basename(file_path)}",
                            message=msg[:500],
                            raw_text=msg
                        )
                        if level == "CRITICAL":
                            await create_alert(
                                severity="CRITICAL",
                                title=f"Critical Log Event in {os.path.basename(file_path)}",
                                message=msg[:200]
                            )
            except (PermissionError, IOError) as e:
                # Permission denied or file busy
                continue
            except Exception as e:
                logger.error(f"Error scanning log file {file_path}: {e}")

async def scan_docker_container_errors():
    """Scans running or recently exited containers for errors in stderr"""
    client = get_docker_client()
    if not client:
        return
        
    try:
        containers = client.containers.list(all=True)
        for c in containers:
            # Check if container died with non-zero exit code
            attrs = c.attrs
            state = attrs.get("State", {})
            exit_code = state.get("ExitCode", 0)
            status = state.get("Status", "")
            
            if status in ("exited", "dead") and exit_code != 0:
                err_hash = f"{c.id}:{state.get('FinishedAt')}:{exit_code}"
                if err_hash not in seen_docker_log_hashes:
                    seen_docker_log_hashes.add(err_hash)
                    err_msg = f"Container '{c.name}' crashed with exit code {exit_code}: {state.get('Error', 'Unknown failure')}"
                    await log_server_error(
                        level="CRITICAL",
                        source=f"container:{c.name}",
                        message=err_msg,
                        raw_text=str(state)
                    )
                    await create_alert(
                        severity="CRITICAL",
                        title=f"Container Crash: {c.name}",
                        message=err_msg
                    )

            # Check health check status
            health = state.get("Health", {})
            if health.get("Status") == "unhealthy":
                health_hash = f"{c.id}:unhealthy:{datetime.now().strftime('%Y-%m-%d-%H')}"
                if health_hash not in seen_docker_log_hashes:
                    seen_docker_log_hashes.add(health_hash)
                    await log_server_error(
                        level="ERROR",
                        source=f"container:{c.name}",
                        message=f"Container '{c.name}' failed Docker health check!",
                        raw_text=str(health.get("Log", []))[-500:]
                    )
                    await create_alert(
                        severity="ERROR",
                        title=f"Unhealthy Container: {c.name}",
                        message=f"Container {c.name} health check is failing"
                    )

            # Check recent stderr logs (tail 20 lines)
            try:
                recent_logs = c.logs(stderr=True, stdout=False, tail=20, since=int(datetime.now().timestamp()) - 30)
                lines = recent_logs.decode('utf-8', errors='replace').splitlines()
                for line in lines:
                    level, msg = parse_log_line(line)
                    if level in ("ERROR", "CRITICAL"):
                        msg_hash = f"{c.id}:{msg[:60]}"
                        if msg_hash not in seen_docker_log_hashes:
                            seen_docker_log_hashes.add(msg_hash)
                            if len(seen_docker_log_hashes) > 1000:
                                seen_docker_log_hashes.clear()
                            await log_server_error(
                                level=level,
                                source=f"container:{c.name}",
                                message=msg[:500],
                                raw_text=msg
                            )
            except Exception:
                pass
    except Exception as e:
        logger.error(f"Error checking docker container logs: {e}")

async def run_log_scanner():
    await scan_file_logs()
    await scan_docker_container_errors()
