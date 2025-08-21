from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field
from .models import ServiceType


class PatientCreate(BaseModel):
	full_name: str
	phone_e164: str
	whatsapp_e164: Optional[str] = None
	preferred_channel: str = Field(default="sms", regex="^(sms|whatsapp)$")
	language: str = "en"


class PatientRead(BaseModel):
	id: int
	full_name: str
	phone_e164: str
	whatsapp_e164: Optional[str]
	preferred_channel: str
	language: str
	is_opted_out: bool

	class Config:
		orm_mode = True


class AppointmentCreate(BaseModel):
	patient_id: int
	service_type: ServiceType
	scheduled_date: date
	notes: Optional[str] = None


class AppointmentRead(BaseModel):
	id: int
	patient_id: int
	service_type: ServiceType
	scheduled_date: date
	status: str
	last_reminded_at: Optional[datetime]
	notes: Optional[str]

	class Config:
		orm_mode = True


class AppointmentStatusUpdate(BaseModel):
	status: str = Field(regex="^(scheduled|attended|missed)$")


class RunRemindersResponse(BaseModel):
	attempted: int
	sent: int
	failed: int
