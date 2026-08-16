import httpx
import logging
from app.config.settings import settings

logger = logging.getLogger(__name__)

class NotificationClient:
    def __init__(self):
        self.base_url = settings.notification_service_url.rstrip("/")

    async def notify(self, notification_type: str, recipient: str, data: dict):
        """
        Send a notification request to the Notification Service.
        """
        url = f"{self.base_url}/api/notifications/send"
        payload = {
            "type": notification_type,
            "recipient": recipient,
            "data": data
        }
        
        async with httpx.AsyncClient() as client:
            try:
                # Fire and forget / non-blocking
                response = await client.post(url, json=payload, timeout=5.0)
                if response.status_code != 200:
                    logger.warning(f"Notification Service returned status {response.status_code}")
            except Exception as e:
                logger.error(f"Failed to send notification: {str(e)}")
