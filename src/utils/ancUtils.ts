
import { addDays, differenceInWeeks, subWeeks } from "date-fns";
import { ANC_SCHEDULE, AncVisit } from "@/types/anc";

/**
 * Naegele's rule: EDD = LMP + 280 days (40 weeks)
 */
export const calculateEddFromLmp = (lmp: Date): Date => {
  return addDays(lmp, 280);
};

/**
 * Calculate current gestational age in completed weeks based on LMP.
 */
export const calculateGestationalAge = (lmp: Date): number => {
  const weeks = differenceInWeeks(new Date(), lmp);
  return Math.max(0, weeks);
};

/**
 * Determine trimester from gestational age in weeks.
 * 1st: <13w, 2nd: 13–26w, 3rd: 27w+
 */
export const calculateTrimester = (weeks: number): 1 | 2 | 3 => {
  if (weeks < 13) return 1;
  if (weeks < 27) return 2;
  return 3;
};

/**
 * Generates an ANC visit schedule based on the Expected Date of Delivery (EDD).
 * EDD corresponds to 40 weeks of gestation, so we calculate backwards
 * to find dates for earlier visits.
 */
export const generateAncSchedule = (
  edd: Date,
  clientId: string
): Omit<AncVisit, 'id' | 'created_at'>[] => {
  const schedule: Omit<AncVisit, 'id' | 'created_at'>[] = [];
  const today = new Date();

  ANC_SCHEDULE.forEach((visit) => {
    // EDD = 40 weeks gestation. Visit at X weeks = EDD - (40 - X) weeks
    const weeksBeforeEdd = 40 - visit.gestational_weeks;
    const scheduledDate = subWeeks(edd, weeksBeforeEdd);

    // Determine status: if the scheduled date is in the past, mark as 'Missed'
    const status = scheduledDate < today ? 'Missed' : 'Pending';

    schedule.push({
      client_id: clientId,
      visit_number: visit.visit_number,
      visit_name: visit.visit_name,
      gestational_weeks: visit.gestational_weeks,
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      status,
      actual_date: null,
      notes: null,
    });
  });

  return schedule.sort((a, b) =>
    new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
  );
};

export const getNextAncVisit = (
  ancVisits: AncVisit[]
): AncVisit | null => {
  const now = new Date();

  const upcoming = ancVisits
    .filter(visit =>
      visit.status === 'Pending' &&
      new Date(visit.scheduled_date) >= now
    )
    .sort((a, b) =>
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );

  return upcoming.length > 0 ? upcoming[0] : null;
};

export const getOverdueAncVisits = (
  ancVisits: AncVisit[]
): AncVisit[] => {
  const now = new Date();

  return ancVisits
    .filter(visit =>
      visit.status === 'Pending' &&
      new Date(visit.scheduled_date) < now
    )
    .sort((a, b) =>
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
};
