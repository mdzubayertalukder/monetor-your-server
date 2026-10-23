import time
import psutil
import os
import platform
from typing import Dict, Any, List

# To calculate network transfer rates
last_net_time = time.time()
last_net_bytes_sent = 0
last_net_bytes_recv = 0

def init_net_counters():
    global last_net_time, last_net_bytes_sent, last_net_bytes_recv
    try:
        net = psutil.net_io_counters()
        last_net_bytes_sent = net.bytes_sent
        last_net_bytes_recv = net.bytes_recv
        last_net_time = time.time()
    except Exception:
        pass

init_net_counters()

def get_system_metrics() -> Dict[str, Any]:
    global last_net_time, last_net_bytes_sent, last_net_bytes_recv
    
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_cores = psutil.cpu_percent(interval=None, percpu=True)
    cpu_count = psutil.cpu_count(logical=True)
    
    try:
        load_avg = [x / (cpu_count or 1) for x in os.getloadavg()]
        load_raw = list(os.getloadavg())
    except Exception:
        load_avg = [0.0, 0.0, 0.0]
        load_raw = [0.0, 0.0, 0.0]

    # Memory
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # Disk Usage for root / or main partitions
    disks = []
    total_disk_used = 0
    total_disk_size = 0
    
    try:
        partitions = psutil.disk_partitions(all=False)
        seen_mounts = set()
        for p in partitions:
            if p.mountpoint in seen_mounts or 'loop' in p.device:
                continue
            seen_mounts.add(p.mountpoint)
            try:
                usage = psutil.disk_usage(p.mountpoint)
                total_disk_size += usage.total
                total_disk_used += usage.used
                disks.append({
                    "device": p.device,
                    "mountpoint": p.mountpoint,
                    "fstype": p.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent
                })
            except (PermissionError, FileNotFoundError):
                continue
    except Exception:
        pass

    if not disks:
        # Fallback to root
        try:
            usage = psutil.disk_usage('/')
            total_disk_size = usage.total
            total_disk_used = usage.used
            disks.append({
                "device": "/",
                "mountpoint": "/",
                "fstype": "ext4",
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent
            })
        except Exception:
            pass

    overall_disk_percent = round((total_disk_used / total_disk_size * 100), 1) if total_disk_size > 0 else 0.0

    # Network rates
    current_time = time.time()
    dt = current_time - last_net_time if (current_time - last_net_time) > 0 else 1.0
    
    try:
        net = psutil.net_io_counters()
        bytes_sent_diff = max(0, net.bytes_sent - last_net_bytes_sent)
        bytes_recv_diff = max(0, net.bytes_recv - last_net_bytes_recv)
        
        tx_rate_kbps = round((bytes_sent_diff / dt) / 1024, 2)
        rx_rate_kbps = round((bytes_recv_diff / dt) / 1024, 2)
        
        last_net_bytes_sent = net.bytes_sent
        last_net_bytes_recv = net.bytes_recv
        last_net_time = current_time
        
        total_sent = net.bytes_sent
        total_recv = net.bytes_recv
    except Exception:
        tx_rate_kbps = 0.0
        rx_rate_kbps = 0.0
        total_sent = 0
        total_recv = 0

    # Uptime & Boot time
    boot_time = psutil.boot_time()
    uptime_seconds = int(time.time() - boot_time)

    # OS Info
    os_info = {
        "system": platform.system(),
        "release": platform.release(),
        "hostname": platform.node(),
        "architecture": platform.machine(),
        "python_version": platform.python_version()
    }

    return {
        "timestamp": time.time(),
        "cpu": {
            "percent": cpu_percent,
            "cores": cpu_cores,
            "core_count": cpu_count,
            "load_1m": round(load_raw[0], 2),
            "load_5m": round(load_raw[1], 2),
            "load_15m": round(load_raw[2], 2),
            "load_normalized": round(load_avg[0], 2)
        },
        "memory": {
            "total": mem.total,
            "available": mem.available,
            "used": mem.used,
            "free": mem.free,
            "percent": mem.percent,
            "swap_total": swap.total,
            "swap_used": swap.used,
            "swap_percent": swap.percent
        },
        "disk": {
            "overall_percent": overall_disk_percent,
            "total": total_disk_size,
            "used": total_disk_used,
            "partitions": disks
        },
        "network": {
            "tx_rate_kbps": tx_rate_kbps,
            "rx_rate_kbps": rx_rate_kbps,
            "total_sent_bytes": total_sent,
            "total_recv_bytes": total_recv
        },
        "uptime_seconds": uptime_seconds,
        "os": os_info
    }

def get_top_processes(limit: int = 10) -> List[Dict[str, Any]]:
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent', 'status', 'create_time']):
        try:
            info = proc.info
            processes.append({
                "pid": info['pid'],
                "name": info['name'] or "unknown",
                "user": info['username'] or "system",
                "cpu": round(info['cpu_percent'] or 0.0, 1),
                "memory": round(info['memory_percent'] or 0.0, 1),
                "status": info['status'] or "unknown"
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
            
    # Sort by CPU + Memory
    processes.sort(key=lambda p: (p['cpu'], p['memory']), reverse=True)
    return processes[:limit]
