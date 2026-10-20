
import { addDays, addWeeks } from "date-fns";
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

/** Minimum interval between consecutive doses of a multi-dose series (EPI catch-up rule). */
export const CATCH_UP_MIN_INTERVAL_DAYS = 28;

/** Series key + dose number for multi-dose vaccines, e.g. "Pentavalent 2" → { series: "Pentavalent", dose: 2 }. */
export const parseSeries = (name: string): { series: string; dose: number } | null => {
  const m = name.match(/^(OPV|Pentavalent|PCV|Rotavirus|Measles)\s+(\d+)$/i);
  return m ? { series: m[1], dose: Number(m[2]) } : null;
};

/**
 * After a dose is administered on `givenOn`, return due-date changes for later
 * doses of the same series so each stays at least 4 weeks after the previous.
 * Only pending/missed doses are moved, and only forward.
 */
export const computeCatchUpShifts = (
  records: Pick<ImmunizationRecord, "id" | "vaccine_name" | "due_date" | "status">[],
  administeredId: string,
  givenOn: Date
): { id: string; due_date: string }[] => {
  const given = records.find((r) => r.id === administeredId);
  const p = given && parseSeries(given.vaccine_name);
  if (!p) return [];
  const later = records
    .map((r) => ({ r, s: parseSeries(r.vaccine_name) }))
    .filter((x) => x.s && x.s.series.toLowerCase() === p.series.toLowerCase() && x.s.dose > p.dose && x.r.status !== "Administered")
    .sort((a, b) => a.s!.dose - b.s!.dose);
  const out: { id: string; due_date: string }[] = [];
  let prev = givenOn;
  for (const { r } of later) {
    const min = addDays(prev, CATCH_UP_MIN_INTERVAL_DAYS);
    const current = new Date(r.due_date);
    const next = current < min ? min : current;
    if (next.getTime() !== current.getTime()) out.push({ id: r.id, due_date: next.toISOString().split("T")[0] });
    prev = next;
  }
  return out;
};
