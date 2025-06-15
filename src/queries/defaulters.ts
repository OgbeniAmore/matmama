
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types";

export const fetchDefaulters = async (): Promise<Client[]> => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("status", "Defaulting")
      .order("due_date", { ascending: true });
  
    if (error) {
      console.error("Error fetching defaulters:", error);
      throw new Error(error.message);
    }
  
    return data.map((p) => ({
      ...p,
      dueDate: new Date(p.due_date),
      assignedTo: p.assigned_to,
      childDob: p.child_dob ? new Date(p.child_dob) : undefined,
      childName: p.child_name || undefined,
      edd: p.edd ? new Date(p.edd) : undefined,
    }));
  };
