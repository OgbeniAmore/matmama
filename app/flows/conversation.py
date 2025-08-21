from __future__ import annotations

from datetime import datetime, date
from typing import Dict, Optional
import re

from sqlmodel import select
from ..database import get_session
from ..models import Contact, ConversationState, Enrollment
from ..utils.dates import parse_nigeria_date


WELCOME = (
	"Welcome! Reply with: \n"
	"1 Immunization\n"
	"2 ANC (Antenatal Care)\n"
	"3 Family Planning\n"
	"4 Tuberculosis"
)


async def handle_incoming_message(payload: Dict[str, str]) -> None:
	from_number = payload.get("From", "")
	to_number = payload.get("To", "")
	body = (payload.get("Body") or "").strip()
	channel = "whatsapp" if from_number.startswith("whatsapp:") else "sms"
	from_number_norm = from_number.replace("whatsapp:", "")

	# Persist or load contact and state
	with get_session() as session:
		contact = session.exec(
			select(Contact).where(Contact.phone_number == from_number_norm)
		).first()
		if contact is None:
			contact = Contact(phone_number=from_number_norm, channel=channel)
			session.add(contact)
			session.commit()
			session.refresh(contact)

		state = session.exec(
			select(ConversationState).where(ConversationState.contact_id == contact.id)
		).first()
		if state is None:
			state = ConversationState(contact_id=contact.id, state="menu")
			session.add(state)
			session.commit()
			session.refresh(state)

		response: Optional[str] = None
		if state.state == "menu":
			if body in {"1", "2", "3", "4"}:
				mapping = {"1": "IMM", "2": "ANC", "3": "FP", "4": "TB"}
				program = mapping[body]
				state.state = f"{program}:start"
				state.updated_at = datetime.utcnow()
				session.add(state)
				session.commit()
				response = _prompt_for_program(program)
			else:
				response = WELCOME
		elif state.state == "IMM:start":
			response = "Please enter child's date of birth (e.g., 24-02-2025)."
			state.state = "IMM:await_dob"
			state.updated_at = datetime.utcnow()
			session.add(state)
			session.commit()
		elif state.state == "IMM:await_dob":
			dob = parse_nigeria_date(body)
			if dob is None:
				response = "Invalid date. Use DD-MM-YYYY."
			else:
				_enroll_or_update(session, contact.id, program="IMM", child_dob=dob)
				response = "Enrolled for Immunization reminders. We'll send schedule-based alerts."
				state.state = "menu"
				state.updated_at = datetime.utcnow()
				session.add(state)
				session.commit()
		elif state.state == "ANC:start":
			response = "Please enter Expected Delivery Date (EDD) e.g., 15-11-2025"
			state.state = "ANC:await_edd"
			state.updated_at = datetime.utcnow()
			session.add(state)
			session.commit()
		elif state.state == "ANC:await_edd":
			edd = parse_nigeria_date(body)
			if edd is None:
				response = "Invalid date. Use DD-MM-YYYY."
			else:
				_enroll_or_update(session, contact.id, program="ANC", edd=edd)
				response = "Enrolled for ANC reminders. We'll send appointment reminders."
				state.state = "menu"
				state.updated_at = datetime.utcnow()
				session.add(state)
				session.commit()
		elif state.state == "FP:start":
			response = "Enter drug start date (DD-MM-YYYY) for Family Planning."
			state.state = "FP:await_start"
			state.updated_at = datetime.utcnow()
			session.add(state)
			session.commit()
		elif state.state == "FP:await_start":
			start_date = parse_nigeria_date(body)
			if start_date is None:
				response = "Invalid date. Use DD-MM-YYYY."
			else:
				_enroll_or_update(session, contact.id, program="FP", start_date=start_date)
				response = "Enrolled for Family Planning drug reminders."
				state.state = "menu"
				state.updated_at = datetime.utcnow()
				session.add(state)
				session.commit()
		elif state.state == "TB:start":
			response = "Enter TB treatment start date (DD-MM-YYYY)."
			state.state = "TB:await_start"
			state.updated_at = datetime.utcnow()
			session.add(state)
			session.commit()
		elif state.state == "TB:await_start":
			start_date = parse_nigeria_date(body)
			if start_date is None:
				response = "Invalid date. Use DD-MM-YYYY."
			else:
				_enroll_or_update(session, contact.id, program="TB", start_date=start_date)
				response = "Enrolled for TB treatment reminders."
				state.state = "menu"
				state.updated_at = datetime.utcnow()
				session.add(state)
				session.commit()
		else:
			response = WELCOME

		# send response via Twilio
		if response:
			from ..messaging.twilio_client import send_message
			await send_message(to=from_number_norm, body=response, channel=channel)  # type: ignore[arg-type]


def _prompt_for_program(program: str) -> str:
	if program == "IMM":
		return "Immunization selected. " + "Please enter child's date of birth (DD-MM-YYYY)."
	if program == "ANC":
		return "ANC selected. Enter Expected Delivery Date (DD-MM-YYYY)."
	if program == "FP":
		return "Family Planning selected. Enter drug start date (DD-MM-YYYY)."
	if program == "TB":
		return "TB selected. Enter treatment start date (DD-MM-YYYY)."
	return WELCOME


def _enroll_or_update(session, contact_id: int, program: str, **kwargs) -> None:
	enrollment = session.exec(
		select(Enrollment).where(
			Enrollment.contact_id == contact_id, Enrollment.program == program
		)
	).first()
	if enrollment is None:
		enrollment = Enrollment(contact_id=contact_id, program=program)  # type: ignore[arg-type]
		for k, v in kwargs.items():
			setattr(enrollment, k, v)
		session.add(enrollment)
	else:
		for k, v in kwargs.items():
			setattr(enrollment, k, v)
	
	session.commit()
