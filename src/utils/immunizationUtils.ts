
import { addWeeks } from "date-fns";
import { EpiSchedule, ImmunizationRecord } from "@/types/immunization";

export const generateImmunizationSchedule = (
  childDob: Date,
  epiSchedule: EpiSchedule[],
  clientId: string
): Omit<ImmunizationRecord, 'id' | 'created_at'>[] => {
  const schedule: Omit<ImmunizationRecord, 'id' | 'created_at'>[] = [];

  epiSchedule.forEach((vaccine) => {
    const scheduledDate = addWeeks(childDob, vaccine.age_weeks);

    schedule.push({
      client_id: clientId,
      vaccine_name: vaccine.vaccine_name,
      due_date: scheduledDate.toISOString().split('T')[0],
      status: 'Pending',
      age_weeks: vaccine.age_weeks,
    });
  });

  return schedule.sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );
};

export const getNextDueVaccine = (
  immunizationRecords: ImmunizationRecord[]
): ImmunizationRecord | null => {
  const now = new Date();
  
  const upcomingVaccines = immunizationRecords
    .filter(record => 
      record.status === 'Pending' && 
      new Date(record.due_date) >= now
    )
    .sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );

  return upcomingVaccines.length > 0 ? upcomingVaccines[0] : null;
};

export const getOverdueVaccines = (
  immunizationRecords: ImmunizationRecord[]
): ImmunizationRecord[] => {
  const now = new Date();
  
  return immunizationRecords
    .filter(record => 
      record.status === 'Pending' && 
      new Date(record.due_date) < now
    )
    .sort((a, b) => 
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
};
