
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { patients as initialPatients } from "@/data/patients";
import { Patient } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChpForm, ChpFormValues } from "@/components/ChpForm";
import { PlusCircle, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChpData {
  name: string;
  patientCount: number;
}

const Chps = () => {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  const initialChpsData: ChpData[] = useMemo(() => {
    const chpNames = [...new Set(patients.map((p) => p.assignedTo))];
    return chpNames.map((name) => ({
      name,
      patientCount: patients.filter((p) => p.assignedTo === name).length,
    }));
  }, [patients]);

  const [chpsData, setChpsData] = useState<ChpData[]>(initialChpsData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [chpToEdit, setChpToEdit] = useState<ChpData | null>(null);

  const handleSaveChp = (data: ChpFormValues): boolean => {
    if (chpToEdit) {
      if (
        chpsData.some(
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

      setPatients((prevPatients) =>
        prevPatients.map((p) =>
          p.assignedTo === chpToEdit.name ? { ...p, assignedTo: data.name } : p
        )
      );

      setChpsData((prevChps) =>
        prevChps.map((chp) =>
          chp.name === chpToEdit.name ? { ...chp, name: data.name } : chp
        )
      );
      toast({
        title: "CHP Updated",
        description:
          "The community health practitioner has been successfully updated.",
      });
    } else {
      if (
        chpsData.some(
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
      const newChp = { name: data.name, patientCount: 0 };
      setChpsData((prevChps) => [...prevChps, newChp]);
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
                ? "Make changes to the CHP's name."
                : "Add a new CHP to the list. You can assign patients later."}
            </DialogDescription>
          </DialogHeader>
          <ChpForm
            onSave={handleSaveChp}
            onFinished={onFormFinished}
            open={isFormOpen}
            initialValues={chpToEdit ? { name: chpToEdit.name } : undefined}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditForm(chp)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit CHP</span>
                  </Button>
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
