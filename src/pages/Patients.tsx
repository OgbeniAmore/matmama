import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Patient, Status, EpiSchedule } from "@/types";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { type PatientFormValues } from "@/components/PatientForm";
import { ViewPatientSheet } from "@/components/ViewPatientSheet";
import { useToast } from "@/hooks/use-toast";
import { generateImmunizationSchedule } from "@/utils/immunizationUtils";
import { PatientCard } from "@/components/PatientCard";
import { PatientCardSkeleton } from "@/components/PatientCardSkeleton";

const fetchPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching patients:", error);
    throw new Error(error.message);
  }

  return data.map((p) => ({
    ...p,
    dueDate: new Date(p.due_date),
    assignedTo: p.assigned_to,
    childDob: p.child_dob ? new Date(p.child_dob) : undefined,
    childName: p.child_name || undefined,
    trimester: p.trimester || undefined,
    edd: p.edd ? new Date(p.edd) : undefined,
  }));
};

const fetchEpiSchedule = async (): Promise<EpiSchedule[]> => {
  const { data, error } = await supabase
    .from("epi_schedule")
    .select("*")
    .order("age_weeks", { ascending: true });

  if (error) {
    console.error("Error fetching EPI schedule:", error);
    throw new Error(error.message);
  }

  return data;
};

const Patients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    data: patients = [],
    isLoading,
    error,
  } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: fetchPatients,
  });

  const { data: epiSchedule = [] } = useQuery<EpiSchedule[]>({
    queryKey: ["epi-schedule"],
    queryFn: fetchEpiSchedule,
  });

  const savePatientMutation = useMutation({
    mutationFn: async ({
      data,
      patientId,
    }: {
      data: PatientFormValues;
      patientId?: string;
    }) => {
      const patientDataForSupabase = {
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

      if (patientId) {
        const { error } = await supabase
          .from("patients")
          .update(patientDataForSupabase)
          .eq("id", patientId);
        if (error) throw error;
      } else {
        const newPatientId = `PAT${String(Date.now()).slice(-6)}`;
        const newPatientData = {
          ...patientDataForSupabase,
          id: newPatientId,
          status: "On Track" as Status,
        };
        
        const { error: patientError } = await supabase.from("patients").insert(newPatientData);
        if (patientError) throw patientError;

        if (data.service === "Routine Immunization" && data.childDob) {
          const immunizationSchedule = generateImmunizationSchedule(
            data.childDob,
            epiSchedule,
            newPatientId
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      toast({
        title: "Success",
        description: patientToEdit ? "Patient updated successfully" : "Patient added successfully with immunization schedule",
      });
    },
    onError: (error, { patientId }) => {
      toast({
        title: "Error",
        description: `Failed to ${
          patientId ? "update" : "add"
        } patient. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSavePatient = (data: PatientFormValues, patientId?: string) => {
    savePatientMutation.mutate({ data, patientId });
  };
  
  const deletePatientMutation = useMutation({
    mutationFn: async (patientId: string) => {
        const { error } = await supabase.from('patients').delete().eq('id', patientId);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        queryClient.invalidateQueries({ queryKey: ['defaulters'] });
        toast({
            title: "Patient Deleted",
            description: "The patient has been successfully deleted.",
        });
    },
    onError: (error) => {
        toast({
            title: "Error",
            description: `Failed to delete patient. ${error.message}`,
            variant: "destructive",
        });
    }
  });

  const handleDeletePatient = (patientId: string) => {
    if (window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")) {
        deletePatientMutation.mutate(patientId);
    }
  };

  const openAddForm = () => {
    setPatientToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (patient: Patient) => {
    setPatientToEdit(patient);
    setIsFormOpen(true);
  };

  const openViewSheet = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewSheetOpen(true);
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading patients: {error.message}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Patients</h1>
            <p className="text-muted-foreground">Manage all patients in the system.</p>
        </div>
        <Button onClick={openAddForm}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Patient
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <PatientCardSkeleton key={i} />
            ))}
        </div>
      ) : patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
                <PatientCard
                    key={patient.id}
                    patient={patient}
                    onView={openViewSheet}
                    onEdit={openEditForm}
                    onDelete={handleDeletePatient}
                />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
            <h2 className="text-2xl font-bold tracking-tight">No patients yet</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">
                You can start managing patients by clicking the button below to add your first one.
            </p>
            <Button onClick={openAddForm} className="mt-6">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Patient
            </Button>
        </div>
      )}

      <ViewPatientSheet
        patient={selectedPatient}
        open={isViewSheetOpen}
        onOpenChange={setIsViewSheetOpen}
        onEdit={openEditForm}
      />
      <AddPatientDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setPatientToEdit(null);
        }}
        patientToEdit={patientToEdit}
        onSave={handleSavePatient}
      />
    </div>
  );
};

export default Patients;
