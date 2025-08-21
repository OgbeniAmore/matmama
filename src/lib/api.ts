import { Patient, Appointment, ReminderLog, ReminderTemplate, ReminderStats } from '@/types/api';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3001/api';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Patient methods
  async getPatients(): Promise<{ patients: Patient[] }> {
    return this.request('/patients');
  }

  async getPatient(id: string): Promise<{ patient: Patient }> {
    return this.request(`/patients/${id}`);
  }

  async createPatient(patient: Omit<Patient, 'id' | 'created_at' | 'updated_at'>): Promise<{ patient: Patient }> {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  }

  async updatePatient(id: string, patient: Partial<Patient>): Promise<{ patient: Patient }> {
    return this.request(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patient),
    });
  }

  async deletePatient(id: string): Promise<{ message: string }> {
    return this.request(`/patients/${id}`, {
      method: 'DELETE',
    });
  }

  async getPatientAppointments(id: string): Promise<{ appointments: Appointment[] }> {
    return this.request(`/patients/${id}/appointments`);
  }

  // Appointment methods
  async getAppointments(params?: {
    status?: string;
    appointment_type?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{ appointments: Appointment[] }> {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/appointments${query}`);
  }

  async getAppointment(id: string): Promise<{ appointment: Appointment }> {
    return this.request(`/appointments/${id}`);
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'status' | 'patients'>): Promise<{ appointment: Appointment }> {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  async updateAppointment(id: string, appointment: Partial<Appointment>): Promise<{ appointment: Appointment }> {
    return this.request(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointment),
    });
  }

  async deleteAppointment(id: string): Promise<{ message: string }> {
    return this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }

  async getDefaulters(): Promise<{ defaulters: Appointment[] }> {
    return this.request('/appointments/defaulters/list');
  }

  async markAppointmentCompleted(id: string): Promise<{ appointment: Appointment; message: string }> {
    return this.request(`/appointments/${id}/complete`, {
      method: 'PATCH',
    });
  }

  async markAppointmentMissed(id: string): Promise<{ appointment: Appointment; message: string }> {
    return this.request(`/appointments/${id}/missed`, {
      method: 'PATCH',
    });
  }

  // Reminder methods
  async getReminderLogs(params?: {
    patient_id?: string;
    appointment_id?: string;
    status?: string;
    limit?: number;
  }): Promise<{ logs: ReminderLog[] }> {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/reminders/logs${query}`);
  }

  async sendManualReminder(data: {
    patient_id: string;
    appointment_id: string;
    message: string;
    reminder_type?: 'sms' | 'whatsapp';
  }): Promise<{ success: boolean; result: any }> {
    return this.request('/reminders/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async triggerReminderCheck(): Promise<{ message: string }> {
    return this.request('/reminders/trigger-check', {
      method: 'POST',
    });
  }

  async getReminderStats(params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<{ stats: ReminderStats }> {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/reminders/stats${query}`);
  }

  // Reminder template methods
  async getReminderTemplates(params?: {
    appointment_type?: string;
    is_active?: boolean;
  }): Promise<{ templates: ReminderTemplate[] }> {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request(`/reminder-templates${query}`);
  }

  async createReminderTemplate(template: Omit<ReminderTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<{ template: ReminderTemplate }> {
    return this.request('/reminder-templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateReminderTemplate(id: string, template: Partial<ReminderTemplate>): Promise<{ template: ReminderTemplate }> {
    return this.request(`/reminder-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteReminderTemplate(id: string): Promise<{ message: string }> {
    return this.request(`/reminder-templates/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();