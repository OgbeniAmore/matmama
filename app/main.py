from fastapi import FastAPI, Request, Depends
from fastapi.responses import PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from typing import Dict

from .config import get_settings
from .database import init_db
from .scheduler import start_scheduler
from .flows.conversation import handle_incoming_message


def create_app() -> FastAPI:
	settings = get_settings()
	app = FastAPI(title="Health Reminder Chatbot", version="0.1.0")

	app.add_middleware(
		CORSMiddleware,
		allow_origins=["*"],
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)

	@app.on_event("startup")
	async def on_startup():
		init_db()
		start_scheduler()

	@app.get("/health", response_class=PlainTextResponse)
	async def health() -> str:
		return "ok"

	@app.post("/webhook/twilio", response_class=PlainTextResponse)
	async def twilio_webhook(request: Request) -> str:
		# Twilio sends application/x-www-form-urlencoded by default
		form: Dict[str, str] = {k: v for k, v in (await request.form()).items()}
		# Unified handler for SMS and WhatsApp
		await handle_incoming_message(form)
		return "OK"

	return app


app = create_app()
