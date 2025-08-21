from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from .models import ServiceType


class PatientCreate(BaseModel):
	full_name: str
	phone_e164: str
	whatsapp_e164: Optional[str] = None
	preferred_channel: str = Field(default="sms", pattern="^(sms|whatsapp)$")
	language: str = "en"
	# Anchor fields
	date_of_birth: Optional[date] = None
	lmp_date: Optional[date] = None
	edd_date: Optional[date] = None
	fp_start_date: Optional[date] = None
	tb_start_date: Optional[date] = None


class PatientRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	full_name: str
	phone_e164: str
	whatsapp_e164: Optional[str]
	preferred_channel: str
	language: str
	is_opted_out: bool
	date_of_birth: Optional[date]
	lmp_date: Optional[date]
	edd_date: Optional[date]
	fp_start_date: Optional[date]
	tb_start_date: Optional[date]


class AppointmentCreate(BaseModel):
	patient_id: int
	service_type: ServiceType
	scheduled_date: date
	notes: Optional[str] = None


class AppointmentRead(BaseModel):
	model_config = ConfigDict(from_attributes=True)

	id: int
	patient_id: int
	service_type: ServiceType
	scheduled_date: date
	status: str
	last_reminded_at: Optional[datetime]
	notes: Optional[str]


class AppointmentStatusUpdate(BaseModel):
	status: str = Field(pattern="^(scheduled|attended|missed)$")


class RunRemindersResponse(BaseModel):
	attempted: int
	sent: int
	failed: int
