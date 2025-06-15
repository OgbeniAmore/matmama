
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import { ChpFormValues } from "@/components/ChpForm";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ChpsTable } from "@/components/ChpsTable";
import { ChpDialog } from "@/components/ChpDialog";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  facility: string | null;
  local_government: string | null;
  ward: string | null;
}

interface ChpData extends Profile {
  patientCount: number;
}

const fetchChps = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, facility, local_government, ward")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching profiles:", error);
    throw new Error(error.message);
  }

  return data || [];
};

const fetchAllPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase.from("patients").select("id, assigned_to");
  if (error) {
    console.error("Error fetching patients for CHP stats:", error);
    throw new Error(error.message);
  }
  return data.map(p => ({ assignedTo: p.assigned_to } as Patient));
}

const Chps = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: chps = [], isLoading: chpsLoading } = useQuery<Profile[]>({
    queryKey: ['chps'],
    queryFn: fetchChps,
  });

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['chps-patients'],
    queryFn: fetchAllPatients,
  });

  const chpsData: ChpData[] = useMemo(() => {
    const chpPatientCounts = patients.reduce((acc, patient) => {
      const assignedTo = patient.assignedTo || "Unassigned";
      acc[assignedTo] = (acc[assignedTo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return chps.map((chp) => ({
      ...chp,
      patientCount: chpPatientCounts[chp.id] || 0,
    }));
  }, [chps, patients]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chpToEdit, setChpToEdit] = useState<ChpData | null>(null);

  const saveChpMutation = useMutation({
    mutationFn: async ({ data, chpId }: { data: ChpFormValues; chpId?: string }) => {
      if (chpId) {
        // Update existing CHP
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: data.name.split(' ')[0] || data.name,
            last_name: data.name.split(' ').slice(1).join(' ') || null,
          })
          .eq("id", chpId);
        if (error) throw error;
      } else {
        // Create new CHP - this would need proper user creation logic
        // For now, we'll just show an error since we can't create users directly
        throw new Error("Creating new CHPs is not supported in this interface. Please use the authentication system.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chps'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['defaulters'] });
      queryClient.invalidateQueries({ queryKey: ['chps-patients'] });
      toast({
        title: chpToEdit ? "CHP Updated" : "CHP Added",
        description: chpToEdit 
          ? "The community health practitioner has been successfully updated."
          : "The new community health practitioner has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${chpToEdit ? "update" : "add"} CHP. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveChp = (data: ChpFormValues): boolean => {
    saveChpMutation.mutate({ data, chpId: chpToEdit?.id });
    return true;
  };

  const onFormFinished = () => {
    setIsFormOpen(false);
    setChpToEdit(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setChpToEdit(null);
    }
  };

  const openAddForm = () => {
    setChpToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (chp: ChpData) => {
    setChpToEdit(chp);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community Health Practitioners</h1>
          <p className="text-muted-foreground">
            A list of community health practitioners and their assigned patients.
          </p>
        </div>
        <Button onClick={openAddForm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add CHP
        </Button>
      </div>

      <ChpDialog
        isOpen={isFormOpen}
        onOpenChange={handleOpenChange}
        chpToEdit={chpToEdit}
        onSave={handleSaveChp}
        onFinished={onFormFinished}
      />

      <ChpsTable
        chpsData={chpsData}
        isLoading={chpsLoading}
        onEditChp={openEditForm}
      />
    </div>
  );
};

export default Chps;
