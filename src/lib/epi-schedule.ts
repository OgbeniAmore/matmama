
import { addWeeks, addMonths } from "date-fns";

/**
 * Calculates the next immunization appointment date based on Nigeria's EPI schedule.
 * @param dob The child's date of birth.
 * @returns The date of the next appointment.
 */
export function calculateNextAppointment(dob: Date): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date

  const immunizationSchedule = [
    { name: "6 weeks", dueDate: addWeeks(dob, 6) },
    { name: "10 weeks", dueDate: addWeeks(dob, 10) },
    { name: "14 weeks", dueDate: addWeeks(dob, 14) },
    { name: "9 months", dueDate: addMonths(dob, 9) },
    { name: "15 months", dueDate: addMonths(dob, 15) },
  ];

  // Find the first appointment that is due on or after today
  for (const appointment of immunizationSchedule) {
    if (appointment.dueDate >= today) {
      return appointment.dueDate;
    }
  }

  // If all appointments are in the past (for a late registration),
  // this will return the last scheduled appointment date.
  // A more advanced implementation could handle catch-up schedules.
  return immunizationSchedule[immunizationSchedule.length - 1].dueDate;
}
