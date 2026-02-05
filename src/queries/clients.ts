
import { supabase } from "@/integrations/supabase/client";
import { Client, EpiSchedule, Status, Service } from "@/types";
import { type ClientFormValues } from "@/components/ClientForm";
import { generateImmunizationSchedule } from "@/utils/immunizationUtils";

export const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
    throw new Error(error.message);
  }

  return data.map((p) => ({
    ...p,
    service: p.service as Service,
    status: p.status as Status,
    dueDate: new Date(p.due_date),
    assignedTo: p.assigned_to,
    childDob: p.child_dob ? new Date(p.child_dob) : undefined,
    childName: p.child_name || undefined,
    trimester: p.trimester || undefined,
    edd: p.edd ? new Date(p.edd) : undefined,
  }));
};

export const fetchEpiSchedule = async (): Promise<EpiSchedule[]> => {
  const { data, error } = await supabase
    .from("epi_schedule")
    .select("*")
    .order("age_weeks", { ascending: true });

  if (error) {
    console.error("Error fetching EPI schedule:", error);
    throw new Error(error.message);
  }

  return data as EpiSchedule[];
};

export const saveClient = async ({
  data,
  clientId,
  epiSchedule,
}: {
  data: ClientFormValues;
  clientId?: string;
  epiSchedule: EpiSchedule[];
}) => {
  const clientDataForSupabase = {
    name: data.name,
    service: data.service,
    due_date: data.dueDate.toISOString(),
    contact: data.contact,
    address: data.address,
    assigned_to: 'System', // Default value since field is removed
    child_name: data.childName || null,
    child_dob: data.childDob ? data.childDob.toISOString().split('T')[0] : null,
    trimester: data.trimester || null,
    edd: data.edd ? data.edd.toISOString().split('T')[0] : null,
  };

  if (clientId) {
    const { error } = await supabase
      .from("clients")
      .update(clientDataForSupabase)
      .eq("id", clientId);
    if (error) throw error;
  } else {
    const newClientId = `CLI${String(Date.now()).slice(-6)}`;
    const newClientData = {
      ...clientDataForSupabase,
      id: newClientId,
      status: "On Track" as Status,
    };
    
    const { error: clientError } = await supabase.from("clients").insert(newClientData);
    if (clientError) throw clientError;

    if (data.service === "Routine Immunization" && data.childDob) {
      const immunizationSchedule = generateImmunizationSchedule(
        data.childDob,
        epiSchedule,
        newClientId
      );

      if (immunizationSchedule.length > 0) {
        const { error: scheduleError } = await supabase
          .from("immunization_records")
          .insert(immunizationSchedule);
        
        if (scheduleError) {
          console.error("Error creating immunization schedule:", scheduleError);
        }
      }
    }
  }
};

export const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
};
