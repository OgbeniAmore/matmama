from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, Enum, ForeignKey, Index
from sqlalchemy.orm import relationship
from .database import Base
import enum


class ServiceType(str, enum.Enum):
	immunization = "immunization"
	anc = "anc"
	family_planning = "family_planning"
	tb_care = "tb_care"


class Patient(Base):
	__tablename__ = "patients"

	id = Column(Integer, primary_key=True, index=True)
	full_name = Column(String, nullable=False)
	phone_e164 = Column(String, nullable=False, index=True)
	whatsapp_e164 = Column(String, nullable=True, index=True)
	preferred_channel = Column(Enum("sms", "whatsapp", name="channel_enum"), nullable=False, default="sms")
	language = Column(String, nullable=False, default="en")
	# Anchors for schedules
	date_of_birth = Column(Date, nullable=True)  # For EPI
	lmp_date = Column(Date, nullable=True)  # For ANC
	edd_date = Column(Date, nullable=True)  # For ANC (if provided)
	fp_start_date = Column(Date, nullable=True)  # For Family Planning
	tb_start_date = Column(Date, nullable=True)  # For TB care
	is_opted_out = Column(Boolean, nullable=False, default=False)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")


class Appointment(Base):
	__tablename__ = "appointments"

	id = Column(Integer, primary_key=True, index=True)
	patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
	service_type = Column(Enum(ServiceType), nullable=False, index=True)
	scheduled_date = Column(Date, nullable=False)
	status = Column(Enum("scheduled", "attended", "missed", name="appt_status_enum"), nullable=False, default="scheduled", index=True)
	last_reminded_at = Column(DateTime, nullable=True)
	notes = Column(String, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)
	updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

	patient = relationship("Patient", back_populates="appointments")

	__table_args__ = (
		Index("ix_appointments_due", "status", "scheduled_date"),
	)


class OutboundMessage(Base):
	__tablename__ = "outbound_messages"

	id = Column(Integer, primary_key=True)
	patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
	appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
	channel = Column(Enum("sms", "whatsapp", name="channel_enum2"), nullable=False)
	template = Column(String, nullable=False)
	to_e164 = Column(String, nullable=False)
	sent_at = Column(DateTime, nullable=True)
	status = Column(Enum("queued", "sent", "failed", name="msg_status_enum"), nullable=False, default="queued")
	error_message = Column(String, nullable=True)
	created_at = Column(DateTime, default=datetime.utcnow)
