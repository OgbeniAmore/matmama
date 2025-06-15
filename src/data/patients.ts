
import { Patient } from "@/types";
import { addDays, subDays } from "date-fns";

export const patients: Patient[] = [
  {
    id: "PAT001",
    name: "Amina Yusuf",
    service: "Ante Natal Care",
    dueDate: addDays(new Date(), 10),
    status: "On Track",
    contact: "08012345678",
    assignedTo: "Nurse Funmi",
  },
  {
    id: "PAT002",
    name: "Bolanle Adeboye",
    service: "Routine Immunization",
    dueDate: subDays(new Date(), 5),
    status: "Defaulting",
    contact: "08023456789",
    assignedTo: "Dr. Kemi",
  },
  {
    id: "PAT003",
    name: "Chidinma Okafor",
    service: "Family Planning",
    dueDate: addDays(new Date(), 30),
    status: "On Track",
    contact: "08034567890",
    assignedTo: "Nurse Funmi",
  },
  {
    id: "PAT004",
    name: "Fatima Bello",
    service: "Ante Natal Care",
    dueDate: subDays(new Date(), 2),
    status: "Defaulting",
    contact: "08045678901",
    assignedTo: "Dr. Kemi",
  },
  {
    id: "PAT005",
    name: "Grace Johnson",
    service: "Routine Immunization",
    dueDate: addDays(new Date(), 15),
    status: "On Track",
    contact: "08056789012",
    assignedTo: "Nurse Funmi",
  },
  {
    id: "PAT006",
    name: "Hadiza Ibrahim",
    service: "Family Planning",
    dueDate: addDays(new Date(), 5),
    status: "Completed",
    contact: "08067890123",
    assignedTo: "Dr. Kemi",
  },
];
