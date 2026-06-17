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
  external_message_id?: string;
  client_name?: string;
  client_service?: string;
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
    .select("id, name, service")
    .in("id", patientIds);

  if (clientsError) throw clientsError;

  const clientMap = new Map(
    (clients || []).map((c) => [c.id, { name: c.name, service: c.service }])
  );

  return (reminders || []).map((r) => ({
    ...r,
    client_name: clientMap.get(r.patient_id)?.name ?? "Unknown",
    client_service: clientMap.get(r.patient_id)?.service ?? "Unknown",
  }));
};
