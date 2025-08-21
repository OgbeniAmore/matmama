from typing import Optional

from twilio.rest import Client

from ..config import settings
from ..models import Channel


class MessagingService:
    def __init__(self) -> None:
        if not (settings.twilio_account_sid and settings.twilio_auth_token):
            self.client: Optional[Client] = None
        else:
            self.client = Client(settings.twilio_account_sid, settings.twilio_auth_token)

    def send_message(self, to_e164: str, body: str, channel: Channel) -> tuple[Optional[str], Optional[str]]:
        if self.client is None:
            # Running without Twilio credentials (dev mode)
            return ("DEV-MODE", None)

        if channel == Channel.sms:
            message = self.client.messages.create(
                body=body,
                from_=settings.twilio_sms_from,
                to=to_e164,
            )
            return (message.sid, None)
        elif channel == Channel.whatsapp:
            message = self.client.messages.create(
                body=body,
                from_=settings.twilio_whatsapp_from,
                to=f"whatsapp:{to_e164}" if not to_e164.startswith("whatsapp:") else to_e164,
            )
            return (message.sid, None)
        else:
            return (None, "Unsupported channel")

