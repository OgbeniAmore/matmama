from datetime import date, timedelta
from typing import Iterable

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal
from .models import Appointment, AppointmentStatus, ProgramType, Channel, Patient, MessageLog, MessageDirection, MessageStatus, MessageType
from .services.messaging import MessagingService


_scheduler: BackgroundScheduler | None = None


def _grace_days_for_program(program: ProgramType) -> int:
    if program == ProgramType.immunization:
        return settings.grace_days_immunization
    if program == ProgramType.anc:
        return settings.grace_days_anc
    if program == ProgramType.family_planning:
        return settings.grace_days_family_planning
    if program == ProgramType.tb:
        return settings.grace_days_tb
    return 3


def _pick_contact_and_channel(patient: Patient) -> tuple[str | None, Channel | None]:
    preferred = patient.preferred_channel
    if preferred == Channel.whatsapp and not patient.opted_out_whatsapp and patient.whatsapp_e164:
        return (patient.whatsapp_e164, Channel.whatsapp)
    if preferred == Channel.sms and not patient.opted_out_sms and patient.phone_e164:
        return (patient.phone_e164, Channel.sms)
    # Fallback to any available channel not opted-out
    if patient.whatsapp_e164 and not patient.opted_out_whatsapp:
        return (patient.whatsapp_e164, Channel.whatsapp)
    if patient.phone_e164 and not patient.opted_out_sms:
        return (patient.phone_e164, Channel.sms)
    return (None, None)


def _reminder_text(patient: Patient, appt: Appointment) -> str:
    program_labels = {
        ProgramType.immunization: "Immunization",
        ProgramType.anc: "ANC",
        ProgramType.family_planning: "Family Planning",
        ProgramType.tb: "Tuberculosis Care",
    }
    label = program_labels.get(appt.program_type, "Care")
    return (
        f"Hello {patient.full_name}, this is a reminder from the clinic. "
        f"You missed your {label} appointment scheduled on {appt.scheduled_date.isoformat()}. "
        f"Reply 'BOOK' to reschedule or 'STOP' to opt out."
    )


def find_defaulters(db: Session) -> Iterable[Appointment]:
    today = date.today()
    candidates = (
        db.query(Appointment)
        .filter(Appointment.status == AppointmentStatus.scheduled)
        .all()
    )
    defaulters: list[Appointment] = []
    for appt in candidates:
        grace_days = _grace_days_for_program(appt.program_type)
        if appt.scheduled_date + timedelta(days=grace_days) < today:
            defaulters.append(appt)
    return defaulters


def job_send_reminders() -> None:
    db = SessionLocal()
    messaging = MessagingService()
    try:
        for appt in find_defaulters(db):
            patient = db.query(Patient).get(appt.patient_id)
            if patient is None:
                continue
            to_number, channel = _pick_contact_and_channel(patient)
            if not to_number or not channel:
                continue
            body = _reminder_text(patient, appt)
            sid, error = messaging.send_message(to_number, body, channel)
            log = MessageLog(
                patient_id=patient.id,
                appointment_id=appt.id,
                message_direction=MessageDirection.outbound,
                channel=channel,
                message_type=MessageType.reminder,
                body=body,
                provider_message_sid=sid,
                message_status=MessageStatus.sent if sid else MessageStatus.failed,
                error_message=error,
            )
            db.add(log)
        db.commit()
    finally:
        db.close()


def start_scheduler(app: FastAPI) -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone=settings.default_timezone)
    # Run every day at 08:00
    _scheduler.add_job(job_send_reminders, "cron", hour=8, minute=0, id="send_reminders")
    _scheduler.start()


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None

