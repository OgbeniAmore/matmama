from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    database_url: str = Field(default="sqlite:////workspace/data.db", alias="DATABASE_URL")
    default_timezone: str = Field(default="UTC", alias="DEFAULT_TIMEZONE")

    twilio_account_sid: str | None = Field(default=None, alias="TWILIO_ACCOUNT_SID")
    twilio_auth_token: str | None = Field(default=None, alias="TWILIO_AUTH_TOKEN")
    twilio_sms_from: str | None = Field(default=None, alias="TWILIO_SMS_FROM")
    twilio_whatsapp_from: str | None = Field(default=None, alias="TWILIO_WHATSAPP_FROM")

    # Grace periods in days before a client is considered a defaulter per program
    grace_days_immunization: int = Field(default=7, alias="GRACE_DAYS_IMMUNIZATION")
    grace_days_anc: int = Field(default=3, alias="GRACE_DAYS_ANC")
    grace_days_family_planning: int = Field(default=7, alias="GRACE_DAYS_FAMILY_PLANNING")
    grace_days_tb: int = Field(default=2, alias="GRACE_DAYS_TB")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


settings = Settings()  # type: ignore[call-arg]

