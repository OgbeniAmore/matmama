import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error('Missing Twilio configuration. Please check your environment variables.');
}

export const twilioClient = twilio(accountSid, authToken);

export const twilioConfig = {
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
};

export default twilioClient;