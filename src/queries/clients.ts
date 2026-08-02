
import { supabase } from "@/integrations/supabase/client";
import { Client, EpiSchedule, Status, Service } from "@/types";
import { type ClientFormValues } from "@/components/ClientForm";
import { generateImmunizationSchedule } from "@/utils/immunizationUtils";
import { generateAncSchedule } from "@/utils/ancUtils";
import { generateClientId, generateSystemId } from "@/lib/ids";

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
    lmp: p.lmp ? new Date(p.lmp) : undefined,
    lasraa_id: p.lasraa_id || undefined,
    nin_id: p.nin_id || undefined,
    system_id: p.system_id || undefined,
    preferred_channel: (p.preferred_channel || 'sms') as Client["preferred_channel"],
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
  accountId,
  facilityId,
  assignedTo = 'System',
}: {
  data: ClientFormValues;
  clientId?: string;
  epiSchedule: EpiSchedule[];
  accountId: string;
  facilityId: string;
  assignedTo?: string;
}) => {
  // Auto-generate system_id if no LASRAA or NIN provided
  const systemId = (!data.lasraaId && !data.ninId)
    ? generateSystemId()
    : null;


  const clientDataForSupabase = {
    name: data.name,
    service: data.service,
    due_date: data.dueDate.toISOString(),
    contact: data.contact,
    address: data.address,
    assigned_to: assignedTo,
    child_name: data.childName || null,
    child_dob: data.childDob ? data.childDob.toISOString().split('T')[0] : null,
    trimester: data.trimester || null,
    edd: data.edd ? data.edd.toISOString().split('T')[0] : null,
    lmp: data.lmp ? data.lmp.toISOString().split('T')[0] : null,
    account_id: accountId,
    facility_id: facilityId,
    lasraa_id: data.lasraaId || null,
    nin_id: data.ninId || null,
    system_id: systemId,
    preferred_channel: data.preferredChannel || 'sms',
  };

  if (clientId) {
    // Don't update account_id/facility_id on edit
    const { account_id: _a, facility_id: _f, ...updateData } = clientDataForSupabase;
    const { error } = await supabase
      .from("clients")
      .update(updateData)
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

    // Auto-generate immunization schedule for Routine Immunization clients
    if (data.service === "Routine Immunization" && data.childDob) {
      const immunizationSchedule = generateImmunizationSchedule(
        data.childDob,
        epiSchedule,
        newClientId
      );

      if (immunizationSchedule.length > 0) {
        const scheduleWithAccount = immunizationSchedule.map(s => ({ ...s, account_id: accountId }));
        const { error: scheduleError } = await supabase
          .from("immunization_records")
          .insert(scheduleWithAccount);

        if (scheduleError) {
          console.error("Error creating immunization schedule:", scheduleError);
        }
      }
    }

    // Auto-generate ANC visit schedule for Ante Natal Care clients
    if (data.service === "Ante Natal Care" && data.edd) {
      const ancSchedule = generateAncSchedule(data.edd, newClientId);

      if (ancSchedule.length > 0) {
        const ancWithAccount = ancSchedule.map(s => ({ ...s, account_id: accountId }));
        const { error: ancError } = await supabase
          .from("anc_visits")
          .insert(ancWithAccount);

        if (ancError) {
          console.error("Error creating ANC schedule:", ancError);
        }
      }
    }
  }
};

export const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
};
