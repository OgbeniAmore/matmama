
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Patient, Status, EpiSchedule } from "@/types";
import { format } from "date-fns";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { type PatientFormValues } from "@/components/PatientForm";
import { cn } from "@/lib/utils";
import { ViewPatientSheet } from "@/components/ViewPatientSheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generateImmunizationSchedule } from "@/utils/immunizationUtils";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800",
  Defaulting: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

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

const fetchChps = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching CHPs:", error);
    throw new Error(error.message);
  }

  return data.reduce((acc, chp) => {
    const name = [chp.first_name, chp.last_name].filter(Boolean).join(" ") || "Unknown User";
    acc[chp.id] = name;
    return acc;
  }, {} as Record<string, string>);
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

  const { data: chpNames = {} } = useQuery({
    queryKey: ["chp-names"],
    queryFn: fetchChps,
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
        assigned_to: data.assignedTo,
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
      queryClient.invalidateQueries({ queryKey: ["chps"] });
      queryClient.invalidateQueries({ queryKey: ["chp-names"] });
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
        queryClient.invalidateQueries({ queryKey: ['chps'] });
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
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Child Info</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              : patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">
                      {patient.name}
                    </TableCell>
                    <TableCell>{patient.service}</TableCell>
                    <TableCell>
                      {patient.service === "Routine Immunization" ? (
                        <div className="text-sm">
                          <div className="font-medium">{patient.childName}</div>
                          {patient.childDob && (
                            <div className="text-muted-foreground">
                              DOB: {format(patient.childDob, "PP")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>{format(patient.dueDate, "PPP")}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "capitalize",
                          statusColors[patient.status]
                        )}
                        variant="outline"
                      >
                        {patient.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{chpNames[patient.assignedTo] || patient.assignedTo}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => openViewSheet(patient)}
                          >
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => openEditForm(patient)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onSelect={() => handleDeletePatient(patient.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
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
