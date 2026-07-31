import { supabase } from "@/integrations/supabase/client";

export interface LastActor {
  name: string;
  designation?: string;
  action: string;
  at: string;
}

/**
 * Latest audit entry per client record (table_name = 'clients').
 * Returns a map of client id -> last actor info.
 */
export const fetchClientLastActors = async (): Promise<Record<string, LastActor>> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("record_id, action, created_at, actor_name, actor_designation, user_id")
    .eq("table_name", "clients")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) throw error;

  const map: Record<string, LastActor> = {};
  for (const row of data ?? []) {
    if (!row.record_id || map[row.record_id]) continue;
    const name = row.actor_name?.trim();
    if (!name) continue;
    map[row.record_id] = {
      name,
      designation: row.actor_designation ?? undefined,
      action: row.action,
      at: row.created_at,
    };
  }
  return map;
};
