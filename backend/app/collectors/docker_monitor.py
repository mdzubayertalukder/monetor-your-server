import docker
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

def get_docker_client():
    socket_path = os.getenv("DOCKER_SOCKET_PATH", "/var/run/docker.sock")
    if os.path.exists(socket_path):
        try:
            return docker.DockerClient(base_url=f"unix://{socket_path}")
        except Exception as e:
            logger.warning(f"Failed to connect to docker socket at {socket_path}: {e}")
    try:
        return docker.from_env()
    except Exception as e:
        logger.warning(f"Docker client fallback failed: {e}")
        return None

def get_containers_summary() -> Dict[str, Any]:
    client = get_docker_client()
    if not client:
        return {
            "docker_available": False,
            "message": "Docker socket not accessible",
            "containers": [],
            "stats": {"total": 0, "running": 0, "exited": 0, "unhealthy": 0}
        }
    
    containers_list = []
    total = 0
    running = 0
    exited = 0
    unhealthy = 0
    
    try:
        raw_containers = client.containers.list(all=True)
        total = len(raw_containers)
        
        for c in raw_containers:
            try:
                attrs = c.attrs
                state = attrs.get("State", {})
                status = state.get("Status", c.status)
                
                # Health check
                health_info = state.get("Health", {})
                health_status = health_info.get("Status", "none")
                
                if status == "running":
                    running += 1
                elif status in ("exited", "dead"):
                    exited += 1
                    
                if health_status == "unhealthy":
                    unhealthy += 1

                # Format ports
                ports = []
                port_bindings = attrs.get("HostConfig", {}).get("PortBindings") or {}
                for port_proto, host_bindings in port_bindings.items():
                    if host_bindings:
                        for b in host_bindings:
                            ports.append(f"{b.get('HostPort', '')}:{port_proto}")
                    else:
                        ports.append(port_proto)

                # Extract image name directly from attrs without triggering network fetch
                image_name = (
                    attrs.get("Config", {}).get("Image") 
                    or attrs.get("Image", "") 
                    or "unknown"
                )

                containers_list.append({
                    "id": c.short_id,
                    "full_id": c.id,
                    "name": c.name,
                    "image": image_name,
                    "status": status,
                    "state": {
                        "running": state.get("Running", False),
                        "exit_code": state.get("ExitCode", 0),
                        "error": state.get("Error", ""),
                        "started_at": state.get("StartedAt", ""),
                        "finished_at": state.get("FinishedAt", ""),
                        "restart_count": attrs.get("RestartCount", 0),
                        "health": health_status
                    },
                    "ports": ports,
                    "created": attrs.get("Created", "")
                })
            except Exception as item_err:
                logger.warning(f"Error parsing container {c.id}: {item_err}")
                continue
            
        return {
            "docker_available": True,
            "containers": containers_list,
            "stats": {
                "total": total,
                "running": running,
                "exited": exited,
                "unhealthy": unhealthy
            }
        }
    except Exception as e:
        logger.error(f"Error fetching docker containers: {e}")
        return {
            "docker_available": False,
            "message": str(e),
            "containers": [],
            "stats": {"total": 0, "running": 0, "exited": 0, "unhealthy": 0}
        }

def get_container_logs(container_id: str, tail: int = 150) -> Dict[str, Any]:
    client = get_docker_client()
    if not client:
        return {"error": "Docker not available"}
    try:
        container = client.containers.get(container_id)
        # Fetch both stdout and stderr
        logs_bytes = container.logs(stdout=True, stderr=True, tail=tail, timestamps=True)
        log_lines = logs_bytes.decode('utf-8', errors='replace').splitlines()
        
        # Categorize log lines
        formatted_logs = []
        for line in log_lines:
            parts = line.split(" ", 1)
            ts = parts[0] if len(parts) > 1 else ""
            msg = parts[1] if len(parts) > 1 else line
            
            lvl = "INFO"
            low_msg = msg.lower()
            if any(err in low_msg for err in ["error", "fatal", "exception", "critical", "panic", "errno", "failed", "crash"]):
                lvl = "ERROR"
            elif any(warn in low_msg for warn in ["warn", "warning", "deprecated"]):
                lvl = "WARN"
                
            formatted_logs.append({
                "timestamp": ts,
                "level": lvl,
                "message": msg
            })
            
        return {
            "id": container.short_id,
            "name": container.name,
            "status": container.status,
            "logs": formatted_logs
        }
    except Exception as e:
        return {"error": str(e)}

def restart_container(container_id: str) -> Dict[str, Any]:
    client = get_docker_client()
    if not client:
        return {"success": False, "error": "Docker not available"}
    try:
        container = client.containers.get(container_id)
        container.restart(timeout=10)
        return {"success": True, "message": f"Container {container.name} restarted successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}
