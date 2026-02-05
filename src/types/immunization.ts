
export interface EpiSchedule {
  id: string;
  vaccine_name: string;
  age_weeks: number;
  description?: string | null;
}

export interface ImmunizationRecord {
  id: string;
  client_id: string;
  vaccine_name: string;
  due_date: string;
  administered_date?: string | null;
  status: string;
  age_weeks?: number | null;
  created_at: string;
}

export type ImmunizationStatus = 'Pending' | 'Administered' | 'Missed';
