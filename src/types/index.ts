
export type Service = "Routine Immunization" | "Family Planning" | "Ante Natal Care";
export type Status = "On Track" | "Defaulting" | "Completed";

export type PreferredChannel = "sms" | "whatsapp";

export interface Client {
  id: string;
  name: string;
  service: Service;
  dueDate: Date;
  status: Status;
  contact: string;
  address: string;
  assignedTo: string;
  childName?: string;
  childDob?: Date;
  trimester?: number;
  edd?: Date;
  lmp?: Date;
  account_id?: string;
  facility_id?: string;
  lasraa_id?: string;
  nin_id?: string;
  system_id?: string;
  preferred_channel?: PreferredChannel;
  mother_client_id?: string | null;
  gravida?: number | null;
  para?: number | null;
  blood_group?: string | null;
  genotype?: string | null;
  hiv_status?: string | null;
  hepatitis_b_status?: string | null;
  vdrl_status?: string | null;
}

export interface TransferRequest {
  id: string;
  client_id: string;
  source_facility_id: string;
  source_account_id: string;
  target_facility_id: string;
  target_account_id: string;
  requested_by: string;
  approved_by?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Re-export immunization types
export * from './immunization';

// Re-export ANC types
export * from './anc';
