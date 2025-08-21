# Immunization & Care Reminder Bot

Automated WhatsApp and SMS chatbot that sends reminders to defaulters of:

- Immunization
- Antenatal Care (ANC)
- Family Planning
- Tuberculosis (TB) care

Powered by [Twilio](https://www.twilio.com/) messaging APIs and written in Python.

---

## Features

- 📲 Multi-channel messaging (WhatsApp + SMS)
- 🗓️ Daily scheduled job to detect due / overdue visits
- 🏥 Simple SQLite database to store patient schedules
- 🔧 Environment-based configuration – no secrets committed to git
- 🧩 Modular design ready for extension (e.g. email, IVR)

---

## Quick Start

1. **Clone & enter project**
   ```bash
   git clone <your-repo-url>
   cd immunization-reminder-bot
   ```

2. **Create virtualenv & install deps**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Configure environment**
   Copy the sample file and fill in your Twilio credentials and phone numbers:
   ```bash
   cp .env.example .env
   # then edit .env
   ```

4. **Initialize the database**
   ```bash
   python db.py --init
   ```

5. **Add a patient (example)**
   ```bash
   python add_patient.py \
     --name "Jane Doe" \
     --phone "+15551234567" \
     --care ANC \
     --due 2023-09-10 \
     --channel whatsapp
   ```

6. **Run the scheduler** (one-off or via cron/systemd)
   ```bash
   python scheduler.py
   ```

---

## Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN`  | Your Twilio Auth Token  |
| `TWILIO_SMS_FROM`    | Verified Twilio SMS number (e.g. `+15558675309`) |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender (e.g. `whatsapp:+14155238886`) |

---

## Next Steps (Development Roadmap)

- [ ] Config module for loading environment variables
- [ ] Database schema & ORM helpers
- [ ] Message templates
- [ ] Scheduler (APScheduler)
- [ ] Deployment guide (Docker / Heroku / Render)

Contributions welcome! Feel free to open issues or PRs.
