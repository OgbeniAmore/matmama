from datetime import date, timedelta

from app.db import SessionLocal, Base, engine
from app.models import Patient, Appointment, ProgramType


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Patients
        alice = Patient(full_name="Alice A", phone_e164="+12025550001", preferred_channel="sms")
        bob = Patient(full_name="Bob B", whatsapp_e164="+254700000002", preferred_channel="whatsapp")
        carol = Patient(full_name="Carol C", phone_e164="+12025550003", whatsapp_e164="+12025550003", preferred_channel="whatsapp")
        db.add_all([alice, bob, carol])
        db.commit()
        db.refresh(alice)
        db.refresh(bob)
        db.refresh(carol)

        # Appointments in the past to trigger defaulters
        appts = [
            Appointment(patient_id=alice.id, program_type=ProgramType.immunization, scheduled_date=date.today() - timedelta(days=14)),
            Appointment(patient_id=bob.id, program_type=ProgramType.anc, scheduled_date=date.today() - timedelta(days=7)),
            Appointment(patient_id=carol.id, program_type=ProgramType.tb, scheduled_date=date.today() - timedelta(days=5)),
        ]
        db.add_all(appts)
        db.commit()
        print("Seeded sample patients and appointments.")
    finally:
        db.close()


if __name__ == "__main__":
    run()

