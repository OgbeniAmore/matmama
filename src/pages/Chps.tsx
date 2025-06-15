import { useState, useMemo } from "react";
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
import { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChpForm, ChpFormValues } from "@/components/ChpForm";
import { PlusCircle, Pencil, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Chp {
  name: string;
  contact: string;
}

interface ChpData extends Chp {
  patientCount: number;
}

const fetchAllPatients = async (): Promise<Patient[]> => {
  const { data, error } = await supabase.from("patients").select("id, assigned_to");
  if (error) {
    console.error("Error fetching patients for CHP stats:", error);
    throw new Error(error.message);
  }
  // Only need assigned_to for counts, so we can cast to a partial patient
  return data.map(p => ({ assignedTo: p.assigned_to } as Patient));
}

const Chps = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients = [] } = useQuery<Patient[]>({
    queryKey: ['chps-patients'], // Separate query key to not interfere with full patient list
    queryFn: fetchAllPatients,
  });

  const [chps, setChps] = useState<Chp[]>([
    { name: "Dr. Kemi", contact: "2348012345678" },
    { name: "Dr. Funmi", contact: "2348023456789" },
  ]);

  const chpsData: ChpData[] = useMemo(() => {
    const chpPatientCounts = patients.reduce((acc, patient) => {
      const assignedTo = patient.assignedTo || "Unassigned";
      acc[assignedTo] = (acc[assignedTo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return chps.map((chp) => ({
      ...chp,
      patientCount: chpPatientCounts[chp.name] || 0,
    }));
  }, [chps, patients]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chpToEdit, setChpToEdit] = useState<ChpData | null>(null);

  const editChpMutation = useMutation({
    mutationFn: async ({ name, oldName }: { name: string, oldName: string }) => {
      const { error } = await supabase
        .from("patients")
        .update({ assigned_to: name })
        .eq("assigned_to", oldName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['defaulters'] });
      queryClient.invalidateQueries({ queryKey: ['chps-patients'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating patients",
        description: `Could not re-assign patients: ${error.message}`,
        variant: "destructive",
      })
    }
  });

  const handleSaveChp = (data: ChpFormValues): boolean => {
    if (chpToEdit) {
      if (
        chps.some(
          (chp) =>
            chp.name.toLowerCase() === data.name.toLowerCase() &&
            chp.name.toLowerCase() !== chpToEdit.name.toLowerCase()
        )
      ) {
        toast({
          title: "Error",
          description: "A CHP with this name already exists.",
          variant: "destructive",
        });
        return false;
      }

      if (data.name !== chpToEdit.name) {
        editChpMutation.mutate({ name: data.name, oldName: chpToEdit.name });
      }
      
      setChps((prevChps) =>
        prevChps.map((chp) =>
          chp.name === chpToEdit.name ? { ...chp, ...data } : chp
        )
      );
      toast({
        title: "CHP Updated",
        description:
          "The community health practitioner has been successfully updated.",
      });
    } else {
      if (
        chps.some(
          (chp) => chp.name.toLowerCase() === data.name.toLowerCase()
        )
      ) {
        toast({
          title: "Error",
          description: "A CHP with this name already exists.",
          variant: "destructive",
        });
        return false;
      }
      const newChp: Chp = { name: data.name, contact: data.contact };
      setChps((prevChps) => [...prevChps, newChp]);
      toast({
        title: "CHP Added",
        description:
          "The new community health practitioner has been successfully added.",
      });
    }
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
      <Dialog open={isFormOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{chpToEdit ? "Edit CHP" : "Add New CHP"}</DialogTitle>
            <DialogDescription>
              {chpToEdit
                ? "Make changes to the CHP's details."
                : "Add a new CHP to the list. You can assign patients later."}
            </DialogDescription>
          </DialogHeader>
          <ChpForm
            onSave={handleSaveChp}
            onFinished={onFormFinished}
            open={isFormOpen}
            initialValues={chpToEdit ? { name: chpToEdit.name, contact: chpToEdit.contact } : undefined}
          />
        </DialogContent>
      </Dialog>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Assigned Patients</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chpsData.map((chp) => (
              <TableRow key={chp.name}>
                <TableCell className="font-medium">{chp.name}</TableCell>
                <TableCell>{chp.patientCount}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditForm(chp)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Chps;
