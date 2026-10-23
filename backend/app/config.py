import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "PulseOps Server Monitor"
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8088"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Paths
    DOCKER_SOCKET_PATH: str = os.getenv("DOCKER_SOCKET_PATH", "/var/run/docker.sock")
    LOG_PATHS: str = os.getenv("LOG_PATHS", "/var/log/syslog,/var/log/nginx/error.log,/var/log/messages")
    DB_PATH: str = os.getenv("DB_PATH", os.path.join(os.getcwd(), "servermon.db"))
    
    # Intervals & Thresholds
    METRICS_INTERVAL: int = int(os.getenv("METRICS_INTERVAL", "2"))
    HISTORY_MAX_POINTS: int = int(os.getenv("HISTORY_MAX_POINTS", "60"))
    
    ALERT_CPU_THRESHOLD: float = float(os.getenv("ALERT_CPU_THRESHOLD", "85.0"))
    ALERT_RAM_THRESHOLD: float = float(os.getenv("ALERT_RAM_THRESHOLD", "90.0"))
    ALERT_DISK_THRESHOLD: float = float(os.getenv("ALERT_DISK_THRESHOLD", "88.0"))
    
    # Webhooks
    DISCORD_WEBHOOK_URL: str = os.getenv("DISCORD_WEBHOOK_URL", "")
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    GENERIC_WEBHOOK_URL: str = os.getenv("GENERIC_WEBHOOK_URL", "")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
