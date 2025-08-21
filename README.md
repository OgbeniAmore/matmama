# Health Reminder Chatbot (Nigeria)

A FastAPI service that powers a WhatsApp and SMS chatbot to enroll clients and send reminders for Immunization (EPI), ANC, Family Planning, and Tuberculosis care in Nigeria.

## Features
- WhatsApp and SMS via Twilio
- Conversation flows to collect: child DOB (Immunization), EDD (ANC), drug start (FP, TB)
- Encoded Nigeria EPI schedule with automatic milestone generation
- Background scheduler for reminders and defaulter follow-ups (basic)
- SQLite via SQLModel, easily switchable to Postgres

## Quickstart

1. Create `.env` file
```
APP_ENV=development
DATABASE_URL=sqlite:///./data.db
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SMS_FROM=+1xxxxxxxxxx
TIMEZONE=Africa/Lagos
```

2. Install dependencies
```
pip install -r requirements.txt
```

3. Run server
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. Expose webhook publicly (for local dev) using `ngrok` and set Twilio webhook to `/webhook/twilio`.

## Webhook
Twilio will POST `application/x-www-form-urlencoded` with `From`, `To`, `Body`. The service responds with appropriate prompts and enrolls the user.

## Scheduling
- Cron runs every 5 minutes to send due reminders
- Milestones generated periodically based on enrollments

## Notes
- Nigeria EPI schedule simplified; adjust to your program guidelines.
- Add signature verification for Twilio webhooks in production.