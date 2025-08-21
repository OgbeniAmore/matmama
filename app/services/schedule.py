from __future__ import annotations
from datetime import date, datetime, timedelta
from typing import Iterable, List, Optional, Tuple
from sqlalchemy.orm import Session

from ..models import Appointment, Patient, ServiceType


def _add_months(d: date, months: int) -> date:
	# Simple month addition handling year rollover and end-of-month
	year = d.year + (d.month - 1 + months) // 12
	month = (d.month - 1 + months) % 12 + 1
	day = min(d.day, [31,
		29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28,
		31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
	return date(year, month, day)


# Nigeria EPI schedule (core set)
# Source: National EPI common schedule reference (at birth, 6w, 10w, 14w, 9m)
EPI_MILESTONES: List[Tuple[str, timedelta]] = [
	("At birth", timedelta(days=0)),
	("6 weeks", timedelta(weeks=6)),
	("10 weeks", timedelta(weeks=10)),
	("14 weeks", timedelta(weeks=14)),
]

# 9 months handled with month addition to reflect months not weeks

EPI_NOTES = {
	"At birth": "BCG, OPV0, HepB0",
	"6 weeks": "OPV1, Penta1, PCV1",
	"10 weeks": "OPV2, Penta2, PCV2",
	"14 weeks": "OPV3, Penta3, PCV3, IPV",
	"9 months": "Measles (MR), Yellow Fever",
}


def generate_epi_schedule(dob: date) -> List[Tuple[date, str]]:
	if not dob:
		return []
	slots: List[Tuple[date, str]] = []
	for label, delta in EPI_MILESTONES:
		slots.append((dob + delta, f"{label}: {EPI_NOTES[label]}"))
	# 9 months
	slots.append((_add_months(dob, 9), f"9 months: {EPI_NOTES['9 months']}"))
	return slots


ANC_CONTACT_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40]


def _calc_lmp_from_edd(edd: date) -> date:
	return edd - timedelta(days=280)


def generate_anc_schedule(edd: Optional[date] = None, lmp: Optional[date] = None) -> List[Tuple[date, str]]:
	if not lmp and not edd:
		return []
	if not lmp and edd:
		lmp = _calc_lmp_from_edd(edd)
	assert lmp is not None
	slots: List[Tuple[date, str]] = []
	for w in ANC_CONTACT_WEEKS:
		contact_date = lmp + timedelta(weeks=w)
		slots.append((contact_date, f"ANC contact at {w} weeks"))
	return slots


def generate_monthly_followups(start: date, months: int, label_prefix: str) -> List[Tuple[date, str]]:
	return [(_add_months(start, m), f"{label_prefix} follow-up month {m}") for m in range(1, months + 1)]


def generate_fp_schedule(fp_start: Optional[date]) -> List[Tuple[date, str]]:
	if not fp_start:
		return []
	# Default: 3 monthly follow-ups
	return generate_monthly_followups(fp_start, 3, "Family planning")


def generate_tb_schedule(tb_start: Optional[date]) -> List[Tuple[date, str]]:
	if not tb_start:
		return []
	# Default: 6 monthly follow-ups for TB care
	return generate_monthly_followups(tb_start, 6, "TB care")


def ensure_patient_schedule(db: Session, patient: Patient) -> int:
	"""Generate appointments for all applicable services for a patient.
	Returns number of appointments created (new only).
	"""
	created = 0

	def _ensure(slots: List[Tuple[date, str]], service: ServiceType) -> int:
		local_created = 0
		for scheduled_date, note in slots:
			# Avoid duplicates by unique pair (service, date, patient)
			exists = (
				db.query(Appointment)
				.filter(
					Appointment.patient_id == patient.id,
					Appointment.service_type == service,
					Appointment.scheduled_date == scheduled_date,
				)
				.first()
			)
			if exists:
				continue
			appt = Appointment(
				patient_id=patient.id,
				service_type=service,
				scheduled_date=scheduled_date,
				notes=note,
			)
			db.add(appt)
			local_created += 1
		return local_created

	created += _ensure(generate_epi_schedule(patient.date_of_birth) if patient.date_of_birth else [], ServiceType.immunization)
	created += _ensure(generate_anc_schedule(edd=patient.edd_date, lmp=patient.lmp_date), ServiceType.anc)
	created += _ensure(generate_fp_schedule(patient.fp_start_date), ServiceType.family_planning)
	created += _ensure(generate_tb_schedule(patient.tb_start_date), ServiceType.tb_care)

	if created:
		db.commit()
	return created
