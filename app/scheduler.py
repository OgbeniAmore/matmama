from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import List
import pendulum

from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import select

from .config import get_settings
from .database import get_session
from .models import Enrollment, Milestone, Contact
from .messaging.twilio_client import send_message
from .schedules.epi_nigeria import generate_epi_milestones


scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
	global scheduler
	if scheduler is not None:
		return
	scheduler = BackgroundScheduler(timezone=get_settings().timezone)
	scheduler.add_job(send_due_reminders, "interval", minutes=5, id="send_due_reminders", replace_existing=True)
	scheduler.add_job(send_defaulter_followups, "interval", hours=24, id="send_defaulter_followups", replace_existing=True)
	scheduler.add_job(generate_missing_milestones, "interval", hours=6, id="generate_milestones", replace_existing=True)
	scheduler.start()


def _now_lagos() -> datetime:
	return pendulum.now(get_settings().timezone).naive()


def generate_missing_milestones() -> None:
	with get_session() as session:
		enrollments = session.exec(select(Enrollment).where(Enrollment.active == True)).all()
		for enr in enrollments:
			if enr.program == "IMM" and enr.child_dob is not None:
				existing = {m.name for m in enr.milestones}
				for m in generate_epi_milestones(enr.child_dob):
					if m.name not in existing:
						m.enrollment_id = enr.id  # type: ignore[assignment]
						session.add(m)
			elif enr.program in ("FP", "TB") and enr.start_date is not None:
				# Simple weekly reminders for 12 weeks as placeholder
				existing = {m.name for m in enr.milestones}
				for i in range(1, 13):
					name = f"{enr.program} Week {i}"
					if name not in existing:
						due = enr.start_date + timedelta(weeks=i)
						session.add(Milestone(enrollment_id=enr.id, name=name, due_date=due))
			elif enr.program == "ANC" and enr.edd is not None:
				# Monthly ANC visit reminders until EDD
				existing = {m.name for m in enr.milestones}
				cursor = enr.edd - timedelta(weeks=36)  # start around week 4
				index = 1
				while cursor <= enr.edd:
					name = f"ANC Visit {index}"
					if name not in existing:
						session.add(Milestone(enrollment_id=enr.id, name=name, due_date=cursor))
					cursor += timedelta(weeks=4)
					index += 1
			
		session.commit()


def send_due_reminders() -> None:
	now = _now_lagos().date()
	with get_session() as session:
		milestones = session.exec(
			select(Milestone, Enrollment, Contact)
			.join(Enrollment, Milestone.enrollment_id == Enrollment.id)
			.join(Contact, Enrollment.contact_id == Contact.id)
			.where(Milestone.due_date <= now, Milestone.status == "scheduled", Enrollment.active == True)
		).all()
		for milestone, enrollment, contact in milestones:
			body = _build_message(enrollment.program, milestone.name)
			# send
			import asyncio
			asyncio.run(send_message(to=contact.phone_number, body=body, channel=contact.channel))
			milestone.status = "notified"
			milestone.last_notified_at = _now_lagos()
			milestone.notification_attempts += 1
			session.add(milestone)
		session.commit()


def send_defaulter_followups() -> None:
	"""Send follow-ups for milestones that are more than 7 days overdue and not completed."""
	cutoff = _now_lagos().date() - timedelta(days=7)
	with get_session() as session:
		milestones = session.exec(
			select(Milestone, Enrollment, Contact)
			.join(Enrollment, Milestone.enrollment_id == Enrollment.id)
			.join(Contact, Enrollment.contact_id == Contact.id)
			.where(Milestone.due_date <= cutoff, Milestone.status.in_(["scheduled", "notified"]) , Enrollment.active == True)
		).all()
		for milestone, enrollment, contact in milestones:
			body = f"Defaulter follow-up: {milestone.name} is overdue. Please visit your clinic or contact your provider."
			import asyncio
			asyncio.run(send_message(to=contact.phone_number, body=body, channel=contact.channel))
			milestone.status = "defaulted"
			milestone.last_notified_at = _now_lagos()
			milestone.notification_attempts += 1
			session.add(milestone)
		session.commit()


def _build_message(program: str, milestone_name: str) -> str:
	if program == "IMM":
		return f"Immunization reminder: {milestone_name}. Please visit your clinic."
	if program == "ANC":
		return f"ANC reminder: {milestone_name}. Keep your appointment."
	if program == "FP":
		return f"Family Planning: {milestone_name}. Take/Refill as advised."
	if program == "TB":
		return f"TB Treatment: {milestone_name}. Adhere to regimen."
	return f"Reminder: {milestone_name}"
