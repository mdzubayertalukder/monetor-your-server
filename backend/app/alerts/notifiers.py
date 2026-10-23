import httpx
import logging
from backend.app.config import settings

logger = logging.getLogger(__name__)

async def send_discord_notification(title: str, message: str, severity: str = "ERROR"):
    if not settings.DISCORD_WEBHOOK_URL:
        return
    color = 0xFF0000 if severity == "CRITICAL" else 0xFFA500 if severity == "ERROR" else 0x3498DB
    payload = {
        "embeds": [{
            "title": f"🚨 [{severity}] {title}",
            "description": message,
            "color": color,
            "footer": {"text": "PulseOps Monitoring Agent"}
        }]
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(settings.DISCORD_WEBHOOK_URL, json=payload)
    except Exception as e:
        logger.warning(f"Failed to send Discord webhook: {e}")

async def send_slack_notification(title: str, message: str, severity: str = "ERROR"):
    if not settings.SLACK_WEBHOOK_URL:
        return
    payload = {
        "text": f"*[{severity}] {title}*\n{message}"
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(settings.SLACK_WEBHOOK_URL, json=payload)
    except Exception as e:
        logger.warning(f"Failed to send Slack webhook: {e}")

async def send_generic_webhook(title: str, message: str, severity: str = "ERROR"):
    if not settings.GENERIC_WEBHOOK_URL:
        return
    payload = {
        "title": title,
        "message": message,
        "severity": severity,
        "source": "pulseops"
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(settings.GENERIC_WEBHOOK_URL, json=payload)
    except Exception as e:
        logger.warning(f"Failed to send generic webhook: {e}")

async def dispatch_notification(title: str, message: str, severity: str = "ERROR"):
    await send_discord_notification(title, message, severity)
    await send_slack_notification(title, message, severity)
    await send_generic_webhook(title, message, severity)
