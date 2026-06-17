
export interface AncVisit {
  id: string;
  client_id: string;
  visit_number: number;
  visit_name: string;
  gestational_weeks: number;
  scheduled_date: string;
  actual_date?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export type AncVisitStatus = 'Pending' | 'Completed' | 'Missed';

// WHO-recommended 8-contact ANC schedule (gestational weeks)
export const ANC_SCHEDULE = [
  { visit_number: 1, visit_name: 'Booking Visit', gestational_weeks: 12 },
  { visit_number: 2, visit_name: '2nd ANC Visit', gestational_weeks: 20 },
  { visit_number: 3, visit_name: '3rd ANC Visit', gestational_weeks: 26 },
  { visit_number: 4, visit_name: '4th ANC Visit', gestational_weeks: 30 },
  { visit_number: 5, visit_name: '5th ANC Visit', gestational_weeks: 34 },
  { visit_number: 6, visit_name: '6th ANC Visit', gestational_weeks: 36 },
  { visit_number: 7, visit_name: '7th ANC Visit', gestational_weeks: 38 },
  { visit_number: 8, visit_name: 'Final Visit (EDD)', gestational_weeks: 40 },
] as const;
