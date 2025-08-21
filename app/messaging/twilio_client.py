from __future__ import annotations

from typing import Optional, Literal
from twilio.rest import Client
from ..config import get_settings
from ..models import MessageLog
from ..database import get_session


Channel = Literal["sms", "whatsapp"]


def _client() -> Client:
	settings = get_settings()
	return Client(settings.twilio_account_sid, settings.twilio_auth_token)


async def send_message(to: str, body: str, channel: Channel = "sms") -> Optional[str]:
	settings = get_settings()
	client = _client()
	from_number = settings.twilio_sms_from if channel == "sms" else settings.twilio_whatsapp_from
	if channel == "whatsapp" and not to.startswith("whatsapp:"):
		to = f"whatsapp:{to}"

	message = client.messages.create(
		from_=from_number,
		to=to,
		body=body,
	)

	with get_session() as session:
		log = MessageLog(to=to, channel=channel, body=body, provider_sid=message.sid, status=message.status)
		session.add(log)
		session.commit()

	return message.sid
