from datetime import datetime, date
from enum import Enum

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship

from .db import Base


class Channel(str, Enum):
    sms = "sms"
    whatsapp = "whatsapp"


class ProgramType(str, Enum):
    immunization = "immunization"
    anc = "anc"
    family_planning = "family_planning"
    tb = "tb"


class AppointmentStatus(str, Enum):
    scheduled = "scheduled"
    completed = "completed"
    missed = "missed"
    canceled = "canceled"


class MessageDirection(str, Enum):
    outbound = "outbound"
    inbound = "inbound"


class MessageStatus(str, Enum):
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    received = "received"


class MessageType(str, Enum):
    reminder = "reminder"
    general = "general"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    phone_e164 = Column(String(32), nullable=True, unique=False, index=True)
    whatsapp_e164 = Column(String(32), nullable=True, unique=False, index=True)
    preferred_channel = Column(SqlEnum(Channel), nullable=False, default=Channel.sms)
    opted_out_sms = Column(Boolean, default=False, nullable=False)
    opted_out_whatsapp = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    appointments = relationship("Appointment", back_populates="patient", cascade="all, delete-orphan")
    messages = relationship("MessageLog", back_populates="patient", cascade="all, delete-orphan")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    program_type = Column(SqlEnum(ProgramType), nullable=False)
    scheduled_date = Column(Date, nullable=False)
    status = Column(SqlEnum(AppointmentStatus), default=AppointmentStatus.scheduled, nullable=False)
    notes = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="appointments")
    messages = relationship("MessageLog", back_populates="appointment")


class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True)
    message_direction = Column(SqlEnum(MessageDirection), nullable=False)
    channel = Column(SqlEnum(Channel), nullable=False)
    message_type = Column(SqlEnum(MessageType), nullable=False, default=MessageType.general)
    body = Column(Text, nullable=False)
    provider_message_sid = Column(String(128), nullable=True)
    message_status = Column(SqlEnum(MessageStatus), nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    patient = relationship("Patient", back_populates="messages")
    appointment = relationship("Appointment", back_populates="messages")

