
import { addWeeks, addMonths } from "date-fns";
import { EpiSchedule, ImmunizationRecord } from "@/types/immunization";

export const generateImmunizationSchedule = (
  childDob: Date,
  epiSchedule: EpiSchedule[],
  patientId: string
): Omit<ImmunizationRecord, 'id' | 'created_at' | 'updated_at'>[] => {
  const schedule: Omit<ImmunizationRecord, 'id' | 'created_at' | 'updated_at'>[] = [];

  epiSchedule.forEach((vaccine) => {
    let scheduledDate: Date;

    if (vaccine.age_weeks !== null && vaccine.age_weeks !== undefined) {
      // Schedule based on weeks
      scheduledDate = addWeeks(childDob, vaccine.age_weeks);
    } else if (vaccine.age_months !== null && vaccine.age_months !== undefined) {
      // Schedule based on months
      scheduledDate = addMonths(childDob, vaccine.age_months);
    } else {
      // Default to birth date for vaccines like BCG, OPV 0, HepB 0
      scheduledDate = childDob;
    }

    schedule.push({
      patient_id: patientId,
      vaccine_name: vaccine.vaccine_name,
      scheduled_date: scheduledDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      status: 'scheduled',
      notes: vaccine.description || undefined,
    });
  });

  return schedule.sort((a, b) => 
    new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
  );
};

export const getNextDueVaccine = (
  immunizationRecords: ImmunizationRecord[]
): ImmunizationRecord | null => {
  const now = new Date();
  
  // Find the next scheduled vaccine that hasn't been administered
  const upcomingVaccines = immunizationRecords
    .filter(record => 
      record.status === 'scheduled' && 
      new Date(record.scheduled_date) >= now
    )
    .sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );

  return upcomingVaccines.length > 0 ? upcomingVaccines[0] : null;
};

export const getOverdueVaccines = (
  immunizationRecords: ImmunizationRecord[]
): ImmunizationRecord[] => {
  const now = new Date();
  
  return immunizationRecords
    .filter(record => 
      record.status === 'scheduled' && 
      new Date(record.scheduled_date) < now
    )
    .sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
};
