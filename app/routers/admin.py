from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Patient, Appointment, ServiceType
from ..schemas import PatientCreate, PatientRead, AppointmentCreate, AppointmentRead
from ..services.schedule import ensure_patient_schedule

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/patients", response_model=PatientRead)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
	patient = Patient(
		full_name=payload.full_name,
		phone_e164=payload.phone_e164,
		whatsapp_e164=payload.whatsapp_e164,
		preferred_channel=payload.preferred_channel,
		language=payload.language,
		date_of_birth=payload.date_of_birth,
		lmp_date=payload.lmp_date,
		edd_date=payload.edd_date,
		fp_start_date=payload.fp_start_date,
		tb_start_date=payload.tb_start_date,
	)
	db.add(patient)
	db.commit()
	db.refresh(patient)
	# Auto-generate schedule based on provided anchors
	ensure_patient_schedule(db, patient)
	return patient


@router.get("/patients/{patient_id}", response_model=PatientRead)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
	patient = db.query(Patient).filter(Patient.id == patient_id).first()
	if not patient:
		raise HTTPException(status_code=404, detail="Patient not found")
	return patient


@router.post("/patients/{patient_id}/generate_schedule")
def generate_schedule(patient_id: int, db: Session = Depends(get_db)):
	patient = db.query(Patient).filter(Patient.id == patient_id).first()
	if not patient:
		raise HTTPException(status_code=404, detail="Patient not found")
	created = ensure_patient_schedule(db, patient)
	return {"created": created}


@router.get("/patients/{patient_id}/appointments", response_model=List[AppointmentRead])
def list_appointments(patient_id: int, db: Session = Depends(get_db)):
	appointments = (
		db.query(Appointment)
		.filter(Appointment.patient_id == patient_id)
		.order_by(Appointment.scheduled_date.asc())
		.all()
	)
	return appointments
