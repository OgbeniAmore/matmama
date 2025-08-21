from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MessageLog, MessageDirection, MessageStatus, Channel, Patient


router = APIRouter()


@router.post("/webhooks/twilio/sms")
def twilio_sms_webhook(
    From: str = Form(...),  # E.164
    Body: str = Form(...),
    db: Session = Depends(get_db),
):
    normalized = From
    patient = db.query(Patient).filter(Patient.phone_e164 == normalized).first()
    log = MessageLog(
        patient_id=patient.id if patient else None,
        appointment_id=None,
        message_direction=MessageDirection.inbound,
        channel=Channel.sms,
        body=Body,
        message_status=MessageStatus.received,
    )
    db.add(log)

    if patient:
        lower = Body.strip().lower()
        if lower == "stop":
            patient.opted_out_sms = True
        elif lower == "start":
            patient.opted_out_sms = False
    db.commit()
    return {"ok": True}


@router.post("/webhooks/twilio/whatsapp")
def twilio_whatsapp_webhook(
    From: str = Form(...),  # whatsapp:+E.164
    Body: str = Form(...),
    db: Session = Depends(get_db),
):
    normalized = From.replace("whatsapp:", "") if From.startswith("whatsapp:") else From
    patient = db.query(Patient).filter(Patient.whatsapp_e164 == normalized).first()
    log = MessageLog(
        patient_id=patient.id if patient else None,
        appointment_id=None,
        message_direction=MessageDirection.inbound,
        channel=Channel.whatsapp,
        body=Body,
        message_status=MessageStatus.received,
    )
    db.add(log)

    if patient:
        lower = Body.strip().lower()
        if lower == "stop":
            patient.opted_out_whatsapp = True
        elif lower == "start":
            patient.opted_out_whatsapp = False
    db.commit()
    return {"ok": True}

