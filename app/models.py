from __future__ import annotations

from datetime import datetime, date
from typing import Optional, Literal, Dict, Any

from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy.dialects.sqlite import JSON as SQLITE_JSON


Channel = Literal["sms", "whatsapp"]
Program = Literal["IMM", "ANC", "FP", "TB"]
MilestoneStatus = Literal["scheduled", "notified", "completed", "missed", "defaulted"]


class Contact(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	phone_number: str
	channel: Channel
	name: Optional[str] = None
	locale: str = "en"
	timezone: str = "Africa/Lagos"
	created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

	enrollments: list[Enrollment] = Relationship(back_populates="contact")
	states: list[ConversationState] = Relationship(back_populates="contact")


class Enrollment(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	contact_id: int = Field(foreign_key="contact.id")
	program: Program
	active: bool = True
	created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

	# Program-specific fields
	child_name: Optional[str] = None
	child_dob: Optional[date] = None
	edd: Optional[date] = None
	start_date: Optional[date] = None
	meta: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(SQLITE_JSON))

	contact: Contact = Relationship(back_populates="enrollments")
	milestones: list[Milestone] = Relationship(back_populates="enrollment")


class Milestone(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	enrollment_id: int = Field(foreign_key="enrollment.id")
	name: str
	due_date: date
	status: MilestoneStatus = "scheduled"
	last_notified_at: Optional[datetime] = None
	notification_attempts: int = 0
	created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

	enrollment: Enrollment = Relationship(back_populates="milestones")


class MessageLog(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	to: str
	channel: Channel
	body: str
	provider_sid: Optional[str] = None
	status: Optional[str] = None
	created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ConversationState(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	contact_id: int = Field(foreign_key="contact.id")
	state: str
	data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(SQLITE_JSON))
	updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

	contact: Contact = Relationship(back_populates="states")
