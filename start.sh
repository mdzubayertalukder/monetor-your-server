#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  PulseOps Server Monitoring & Diagnostics"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi

echo "🚀 Building and starting PulseOps container stack..."
docker compose up -d --build

echo ""
echo "✅ PulseOps is up and running!"
echo "👉 Web Dashboard: http://localhost:8088"
echo "👉 API Docs:      http://localhost:8088/docs"
echo ""
echo "To view logs in real time, run:"
echo "   docker compose logs -f pulseops"
echo ""
echo "To trigger a simulated server error, run:"
echo "   ./scripts/generate_test_errors.py --type oom"
echo "=========================================="
