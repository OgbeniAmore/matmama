
export type Service = "Routine Immunization" | "Family Planning" | "Ante Natal Care";
export type Status = "On Track" | "Defaulting" | "Completed";

export interface Patient {
  id: string;
  name: string;
  service: Service;
  dueDate: Date;
  status: Status;
  contact: string;
  address: string;
  assignedTo: string;
}
