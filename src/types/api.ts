export interface Patient {
  id: string;
  name: string;
  phone: string;
  whatsapp_number?: string;
  preferred_contact_method: 'sms' | 'whatsapp' | 'both';
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  appointment_type: 'immunization' | 'anc' | 'family_planning' | 'tuberculosis';
  scheduled_date: string;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  patients?: Patient;
}

export interface ReminderLog {
  id: string;
  patient_id: string;
  appointment_id: string;
  reminder_type: 'sms' | 'whatsapp';
  message_content: string;
  status: 'sent' | 'failed' | 'delivered' | 'read';
  sent_at: string;
  attempt_number: number;
  error_message?: string;
  patients?: Patient;
  appointments?: Appointment;
}

export interface ReminderTemplate {
  id: string;
  appointment_type: 'immunization' | 'anc' | 'family_planning' | 'tuberculosis';
  template_name: string;
  message_template: string;
  days_before_appointment: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderStats {
  total: number;
  sent: number;
  failed: number;
  delivered: number;
  sms: number;
  whatsapp: number;
}