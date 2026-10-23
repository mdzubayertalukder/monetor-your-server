# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Python Backend + UI
# ==========================================
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    procps \
    net-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1 \
    PORT=8088 \
    HOST=0.0.0.0 \
    DB_PATH=/app/data/servermon.db \
    DOCKER_SOCKET_PATH=/var/run/docker.sock \
    LOG_PATHS="/var/log/syslog,/var/log/nginx/error.log,/var/log/messages"

EXPOSE 8088

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8088"]
