from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
	# General
	app_env: str = Field(default="development")
	base_url: str = Field(default="http://localhost:8000")
	timezone: str = Field(default="Africa/Lagos")

	# Database
	database_url: str = Field(default="sqlite:///./data.db")

	# Twilio
	twilio_account_sid: str = Field(default="", description="Twilio Account SID")
	twilio_auth_token: str = Field(default="", description="Twilio Auth Token")
	twilio_whatsapp_from: str = Field(default="whatsapp:+14155238886")  # Sandbox default
	twilio_sms_from: str = Field(default="")

	class Config:
		env_file = ".env"
		env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
	return Settings()  # type: ignore[arg-type]
