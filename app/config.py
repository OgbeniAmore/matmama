import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	app_name: str = "Immunization-ANC-FP-TB Reminder Bot"
	debug: bool = True
	# Twilio
	twilio_account_sid: str = ""
	twilio_auth_token: str = ""
	twilio_sms_from: str = ""  # E.164 phone number
	twilio_whatsapp_from: str = ""  # whatsapp:+14155238886
	# Database (sqlite by default)
	database_url: str = "sqlite:///data/app.db"
	# Security
	webhook_secret_token: str = "change-me"

	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache

def get_settings() -> Settings:
	return Settings()
