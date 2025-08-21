# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/ce3d16fb-efa8-4d3f-bbb0-451d92d7f996

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ce3d16fb-efa8-4d3f-bbb0-451d92d7f996) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Backend: Health Reminder Bot (SMS & WhatsApp)

This repo now includes a FastAPI backend that sends automated reminders to clients who default on Immunization, ANC, Family Planning, and Tuberculosis care using Twilio (SMS & WhatsApp).

### Setup
1. Copy environment file and edit values:
```bash
cp .env.example .env
```
2. Ensure Python 3.10+ is available, then install deps:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
3. Seed sample data:
```bash
python seed.py
```
4. Run the API:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Webhooks
Configure Twilio to POST incoming messages to:
- SMS: `/webhooks/twilio/sms`
- WhatsApp: `/webhooks/twilio/whatsapp`

### Manual trigger
Send reminders on demand:
```bash
curl -X POST http://localhost:8000/admin/reminders/run
```

### Notes
- WhatsApp numbers should be in E.164; Twilio uses the `whatsapp:` prefix for From/To in API-level calls, which the service handles.
- Default grace periods are configurable via env vars (see `.env.example`).

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ce3d16fb-efa8-4d3f-bbb0-451d92d7f996) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
