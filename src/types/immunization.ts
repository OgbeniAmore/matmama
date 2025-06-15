
export interface EpiSchedule {
  id: string;
  vaccine_name: string;
  age_weeks?: number;
  age_months?: number;
  description?: string;
  created_at: string;
}

export interface ImmunizationRecord {
  id: string;
  client_id: string;
  vaccine_name: string;
  scheduled_date: string;
  administered_date?: string;
  status: 'scheduled' | 'administered' | 'missed' | 'rescheduled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ImmunizationStatus = 'scheduled' | 'administered' | 'missed' | 'rescheduled';
