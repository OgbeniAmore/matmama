-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create patients table
CREATE TABLE patients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    whatsapp_number VARCHAR(20),
    preferred_contact_method VARCHAR(20) DEFAULT 'sms' CHECK (preferred_contact_method IN ('sms', 'whatsapp', 'both')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_type VARCHAR(50) NOT NULL CHECK (appointment_type IN ('immunization', 'anc', 'family_planning', 'tuberculosis')),
    scheduled_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reminder_templates table
CREATE TABLE reminder_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    appointment_type VARCHAR(50) NOT NULL CHECK (appointment_type IN ('immunization', 'anc', 'family_planning', 'tuberculosis')),
    template_name VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    days_before_appointment INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reminder_logs table
CREATE TABLE reminder_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('sms', 'whatsapp')),
    message_content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'read')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempt_number INTEGER DEFAULT 1,
    error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_reminder_logs_patient_id ON reminder_logs(patient_id);
CREATE INDEX idx_reminder_logs_appointment_id ON reminder_logs(appointment_id);
CREATE INDEX idx_reminder_logs_sent_at ON reminder_logs(sent_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reminder_templates_updated_at BEFORE UPDATE ON reminder_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default reminder templates
INSERT INTO reminder_templates (appointment_type, template_name, message_template, days_before_appointment) VALUES
('immunization', 'Immunization Reminder', 'Hello {{patient_name}}, this is a reminder that your child has an immunization appointment on {{appointment_date}}. Please visit our clinic at the scheduled time. For any questions, call {{clinic_phone}}.', 3),
('anc', 'ANC Reminder', 'Dear {{patient_name}}, you have an Antenatal Care (ANC) appointment scheduled for {{appointment_date}}. Please ensure you attend this important checkup for your health and your baby''s wellbeing. Contact us at {{clinic_phone}} if needed.', 3),
('family_planning', 'Family Planning Reminder', 'Hi {{patient_name}}, this is a reminder about your family planning consultation on {{appointment_date}}. Please visit our clinic as scheduled. Call {{clinic_phone}} for any queries.', 3),
('tuberculosis', 'TB Care Reminder', 'Hello {{patient_name}}, you have a tuberculosis care appointment on {{appointment_date}}. It''s important not to miss your treatment schedule. Please visit our clinic on time. Contact {{clinic_phone}} for assistance.', 2);