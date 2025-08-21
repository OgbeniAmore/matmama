# Healthcare Reminder Chatbot System

A comprehensive WhatsApp and SMS chatbot system for automatically sending reminders to patients who have missed their appointments for immunization, ANC (Antenatal Care), family planning, and tuberculosis care.

## Features

### 🤖 Automated Reminders
- **WhatsApp Integration**: Send reminders via WhatsApp using Twilio API
- **SMS Integration**: Send reminders via SMS using Twilio API
- **Intelligent Scheduling**: Automatic reminder scheduling based on appointment dates
- **Multiple Attempts**: Configurable retry attempts for failed deliveries

### 📋 Patient Management
- **Patient Registration**: Add and manage patient information
- **Contact Preferences**: Support for SMS, WhatsApp, or both
- **Appointment Tracking**: Schedule and track appointments by type

### 🏥 Healthcare Services Supported
- **Immunization**: Child and adult vaccination reminders
- **Antenatal Care (ANC)**: Pregnancy care appointment reminders
- **Family Planning**: Family planning consultation reminders
- **Tuberculosis Care**: TB treatment and follow-up reminders

### 📊 Dashboard & Analytics
- **Real-time Dashboard**: Monitor reminder statistics and defaulters
- **Defaulter Tracking**: Identify patients who missed appointments
- **Delivery Reports**: Track message delivery success rates
- **Analytics**: SMS vs WhatsApp usage statistics

### ⚙️ Configuration
- **Message Templates**: Customizable reminder templates for each service type
- **Scheduling Rules**: Configure reminder timing and frequency
- **Clinic Information**: Customize clinic details in messages

## Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express.js** for REST API
- **Supabase** for database and authentication
- **Twilio** for WhatsApp and SMS messaging
- **node-cron** for automated scheduling

### Frontend
- **React** with TypeScript
- **Vite** for fast development
- **shadcn/ui** for modern UI components
- **Tailwind CSS** for styling
- **React Router** for navigation

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Twilio account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd healthcare-reminder-chatbot
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the database migration:
```bash
# Apply the database schema
supabase db push
```

### 4. Environment Configuration

Create a `.env` file in the root directory:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Server Configuration
PORT=3001
NODE_ENV=development

# Reminder Configuration
DEFAULT_REMINDER_DAYS_BEFORE=3
MAX_REMINDER_ATTEMPTS=3
REMINDER_INTERVAL_HOURS=24

# Clinic Information
CLINIC_NAME=Your Healthcare Clinic
CLINIC_ADDRESS=123 Health Street, City
CLINIC_PHONE=+1234567890
```

### 5. Twilio Setup

1. **Create a Twilio Account**: Sign up at [twilio.com](https://twilio.com)

2. **Get Phone Number**: Purchase a Twilio phone number for SMS

3. **WhatsApp Setup**: 
   - Enable WhatsApp sandbox for testing
   - For production, apply for WhatsApp Business API approval

4. **Configure Webhook** (Optional):
   - Set up webhooks for delivery status updates
   - Webhook URL: `https://your-domain.com/api/webhooks/twilio`

### 6. Running the Application

#### Development Mode
```bash
# Start the backend server
cd server
npm run dev

# In another terminal, start the frontend
cd ..
npm run dev
```

#### Production Mode
```bash
# Build the frontend
npm run build

# Build and start the backend
cd server
npm run build
npm start
```

## Usage Guide

### 1. Patient Management
- Navigate to **Patients** page
- Add patient information including phone numbers
- Set preferred contact method (SMS, WhatsApp, or both)

### 2. Appointment Scheduling
- Go to **Appointments** page
- Schedule appointments for patients
- Select appointment type (Immunization, ANC, Family Planning, TB Care)
- Set appointment dates

### 3. Reminder Configuration
- Access **Settings** page
- Configure reminder templates for each appointment type
- Set timing (days before appointment)
- Customize message content with variables

### 4. Monitoring
- Use **Dashboard** to monitor system performance
- Track defaulters (patients who missed appointments)
- View reminder delivery statistics
- Trigger manual reminder checks

## Message Templates

The system supports customizable message templates with the following variables:

- `{{patient_name}}`: Patient's full name
- `{{appointment_date}}`: Appointment date
- `{{appointment_type}}`: Type of appointment
- `{{clinic_name}}`: Clinic name
- `{{clinic_address}}`: Clinic address
- `{{clinic_phone}}`: Clinic phone number

### Example Template
```
Hello {{patient_name}}, this is a reminder that you have a {{appointment_type}} appointment scheduled for {{appointment_date}}. Please visit our clinic at the scheduled time. For any questions, call {{clinic_phone}}.
```

## API Documentation

### Endpoints

#### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

#### Appointments
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment
- `GET /api/appointments/defaulters/list` - Get defaulters

#### Reminders
- `GET /api/reminders/logs` - Get reminder logs
- `POST /api/reminders/send` - Send manual reminder
- `POST /api/reminders/trigger-check` - Trigger reminder check
- `GET /api/reminders/stats` - Get reminder statistics

#### Templates
- `GET /api/reminder-templates` - Get all templates
- `POST /api/reminder-templates` - Create new template
- `PUT /api/reminder-templates/:id` - Update template
- `DELETE /api/reminder-templates/:id` - Delete template

## Deployment

### Using Docker
```dockerfile
# Dockerfile example
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Using PM2
```bash
npm install -g pm2
pm2 start server/dist/server.js --name "healthcare-reminder"
pm2 startup
pm2 save
```

### Environment Variables for Production
Ensure all environment variables are properly set in your production environment.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team

## Acknowledgments

- Built with modern web technologies
- Powered by Twilio for messaging
- Uses Supabase for database and authentication
- UI components by shadcn/ui