from fastapi import APIRouter

from ..scheduler import job_send_reminders


router = APIRouter()


@router.post("/reminders/run")
def run_reminders():
    job_send_reminders()
    return {"ok": True}

