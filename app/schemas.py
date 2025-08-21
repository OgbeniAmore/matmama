from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field

from .models import Channel, ProgramType, AppointmentStatus, MessageDirection, MessageStatus, MessageType


class PatientCreate(BaseModel):
    full_name: str
    phone_e164: Optional[str] = Field(default=None)
    whatsapp_e164: Optional[str] = Field(default=None)
    preferred_channel: Channel = Field(default=Channel.sms)


class PatientOut(BaseModel):
    id: int
    full_name: str
    phone_e164: Optional[str]
    whatsapp_e164: Optional[str]
    preferred_channel: Channel
    opted_out_sms: bool
    opted_out_whatsapp: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    patient_id: int
    program_type: ProgramType
    scheduled_date: date
    notes: Optional[str] = Field(default=None)


class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    program_type: ProgramType
    scheduled_date: date
    status: AppointmentStatus
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class MessageLogOut(BaseModel):
    id: int
    patient_id: Optional[int]
    appointment_id: Optional[int]
    message_direction: MessageDirection
    channel: Channel
    message_type: MessageType
    body: str
    provider_message_sid: Optional[str]
    message_status: MessageStatus
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

