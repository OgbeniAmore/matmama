from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Patient, Appointment
from ..schemas import PatientCreate, PatientOut, AppointmentCreate, AppointmentOut


router = APIRouter()


@router.post("/patients", response_model=PatientOut)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    patient = Patient(
        full_name=payload.full_name,
        phone_e164=payload.phone_e164,
        whatsapp_e164=payload.whatsapp_e164,
        preferred_channel=payload.preferred_channel,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("/patients/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.post("/appointments", response_model=AppointmentOut)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    # Basic existence check
    patient = db.query(Patient).get(payload.patient_id)
    if not patient:
        raise HTTPException(status_code=400, detail="Patient does not exist")
    appt = Appointment(
        patient_id=payload.patient_id,
        program_type=payload.program_type,
        scheduled_date=payload.scheduled_date,
        notes=payload.notes,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt

