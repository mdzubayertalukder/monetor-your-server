#!/usr/bin/env python3
"""
Test Error Generator for PulseOps Server Monitoring
Simulates various types of server errors to verify error logging and real-time alerts.
Uses standard library urllib so no pip dependencies are required.
"""
import sys
import json
import argparse
import urllib.request
import urllib.error

def trigger_error(base_url: str, level: str, source: str, message: str, raw_text: str = None):
    url = f"{base_url.rstrip('/')}/api/logs/test-error"
    payload = {
        "level": level.upper(),
        "source": source,
        "message": message,
        "raw_text": raw_text or message
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            res_body = response.read().decode('utf-8')
            print(f"✅ Successfully triggered [{level.upper()}] error from '{source}'")
            print(f"   Message: {message}")
            print(f"   Response: {res_body}")
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"❌ Connection error: {e}")

def main():
    parser = argparse.ArgumentParser(description="Simulate server errors for PulseOps")
    parser.add_argument("--url", default="http://localhost:8088", help="PulseOps base URL")
    parser.add_argument("--type", choices=["oom", "db", "nginx", "crash", "custom"], default="db", help="Error scenario")
    parser.add_argument("--level", default="ERROR", choices=["CRITICAL", "ERROR", "WARNING"], help="Severity")
    parser.add_argument("--source", default="test:cli", help="Error source")
    parser.add_argument("--message", default="Simulated unexpected server error", help="Error message")
    args = parser.parse_args()

    scenarios = {
        "db": {
            "level": "ERROR",
            "source": "container:production-db",
            "message": "OperationalError: Connection pool exhausted (Max 100 active connections reached)",
            "trace": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 100 overflow 20 reached."
        },
        "oom": {
            "level": "CRITICAL",
            "source": "kernel:oom_killer",
            "message": "Out of memory: Kill process 29141 (python) score 920",
            "trace": "kernel: [189201.291] Out of memory: Kill process 29141 (python) total-vm:8.2GB, anon-rss:7.9GB"
        },
        "nginx": {
            "level": "ERROR",
            "source": "file:nginx-error.log",
            "message": "connect() failed (111: Connection refused) while connecting to upstream",
            "trace": '2026/10/23 14:02:15 [error] 4812#4812: *9120 upstream "http://127.0.0.1:8000" failed.'
        },
        "crash": {
            "level": "CRITICAL",
            "source": "container:api-worker",
            "message": "Process exited with code 139 (Segmentation fault)",
            "trace": "SIGSEGV encountered in native C extension: memory access violation."
        }
    }

    if args.type in scenarios:
        s = scenarios[args.type]
        trigger_error(args.url, s["level"], s["source"], s["message"], s["trace"])
    else:
        trigger_error(args.url, args.level, args.source, args.message)

if __name__ == "__main__":
    main()
