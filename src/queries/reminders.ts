import { supabase } from "@/integrations/supabase/client";

export interface Reminder {
  id: string;
  patient_id: string;
  reminder_type: string;
  message: string;
  status: string;
  sent_at: string;
  created_at: string;
  reminder_category?: string;
  delivery_status?: string;
  delivery_updated_at?: string;
  retry_count?: number;
  max_retries?: number;
  error_detail?: string;
  last_attempted_at?: string;
  next_retry_at?: string;
  external_message_id?: string;
  client_name?: string;
  client_service?: string;
  facility_id?: string | null;
  facility_name?: string;
}

export const fetchReminders = async (): Promise<Reminder[]> => {
  const { data: reminders, error: remindersError } = await supabase
    .from("patient_reminders")
    .select("*")
    .order("sent_at", { ascending: false });

  if (remindersError) throw remindersError;

  // Fetch associated client names
  const patientIds = [...new Set((reminders || []).map((r) => r.patient_id))];

  if (patientIds.length === 0) return [];

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id, name, service, facility_id")
    .in("id", patientIds);

  if (clientsError) throw clientsError;

  const facilityIds = [
    ...new Set((clients || []).map((c) => c.facility_id).filter(Boolean) as string[]),
  ];

  const facilityMap = new Map<string, string>();
  if (facilityIds.length > 0) {
    const { data: facilities } = await supabase
      .from("facilities")
      .select("id, name")
      .in("id", facilityIds);
    (facilities || []).forEach((f) => facilityMap.set(f.id, f.name));
  }

  const clientMap = new Map(
    (clients || []).map((c) => [
      c.id,
      { name: c.name, service: c.service, facility_id: c.facility_id },
    ])
  );

  return (reminders || []).map((r) => {
    const c = clientMap.get(r.patient_id);
    return {
      ...r,
      client_name: c?.name ?? "Unknown",
      client_service: c?.service ?? "Unknown",
      facility_id: c?.facility_id ?? null,
      facility_name: c?.facility_id
        ? facilityMap.get(c.facility_id) ?? "Unknown facility"
        : "Unassigned",
    };
  });
};

