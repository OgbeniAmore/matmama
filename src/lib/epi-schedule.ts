
import { addWeeks, addMonths } from "date-fns";

export interface ImmunizationAppointment {
  name: string;
  dueDate: Date;
}

/**
 * Calculates the next immunization appointment based on Nigeria's EPI schedule.
 * @param dob The child's date of birth.
 * @returns The next appointment details (name and date), or an object indicating completion.
 */
export function calculateNextAppointment(dob: Date): ImmunizationAppointment {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date

  const immunizationSchedule: ImmunizationAppointment[] = [
    { name: "6 Weeks: PENTA-1, OPV-1, PCV-1, ROTA-1", dueDate: addWeeks(dob, 6) },
    { name: "10 Weeks: PENTA-2, OPV-2, PCV-2, ROTA-2", dueDate: addWeeks(dob, 10) },
    { name: "14 Weeks: PENTA-3, OPV-3, PCV-3, IPV", dueDate: addWeeks(dob, 14) },
    { name: "9 Months: Measles-1, Yellow Fever, Vitamin A", dueDate: addMonths(dob, 9) },
    { name: "15 Months: Measles-2, Meningitis A", dueDate: addMonths(dob, 15) },
  ];

  // Find the first appointment that is due on or after today
  for (const appointment of immunizationSchedule) {
    if (appointment.dueDate >= today) {
      return appointment;
    }
  }

  // If all appointments are in the past, it means the schedule is completed for this standard schedule.
  const lastAppointment = immunizationSchedule[immunizationSchedule.length - 1];
  return {
    name: "Standard schedule completed",
    dueDate: lastAppointment.dueDate,
  };
}
