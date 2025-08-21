from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings
from .db import Base, engine
from .routers import webhooks, patients, admin
from .scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and start scheduler on startup
    Base.metadata.create_all(bind=engine)
    start_scheduler(app)
    try:
        yield
    finally:
        shutdown_scheduler()


app = FastAPI(title="Health Reminder Bot", lifespan=lifespan)

# Routers
app.include_router(patients.router, prefix="/api", tags=["patients"])
app.include_router(webhooks.router, tags=["webhooks"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])


@app.get("/")
def root():
    return {
        "service": "Health Reminder Bot",
        "twilio_sms_from": settings.twilio_sms_from,
        "twilio_whatsapp_from": settings.twilio_whatsapp_from,
    }

