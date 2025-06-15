
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChpForm, ChpFormValues } from "@/components/ChpForm";
import { PlusCircle } from "lucide-react";

interface ChpData {
  name: string;
  patientCount: number;
}

const Chps = () => {
  const [patients] = useState<Patient[]>(initialPatients);

  const initialChpsData: ChpData[] = useMemo(() => {
    const chpNames = [...new Set(patients.map((p) => p.assignedTo))];
    return chpNames.map((name) => ({
      name,
      patientCount: patients.filter((p) => p.assignedTo === name).length,
    }));
  }, [patients]);

  const [chpsData, setChpsData] = useState<ChpData[]>(initialChpsData);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSaveChp = (data: ChpFormValues) => {
    const newChp = { name: data.name, patientCount: 0 };
    if (!chpsData.some(chp => chp.name === newChp.name)) {
      setChpsData((prevChps) => [...prevChps, newChp]);
    }
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
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add CHP
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New CHP</DialogTitle>
            </DialogHeader>
            <ChpForm
              onSave={handleSaveChp}
              onFinished={() => setIsFormOpen(false)}
              open={isFormOpen}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Assigned Patients</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chpsData.map((chp) => (
              <TableRow key={chp.name}>
                <TableCell className="font-medium">{chp.name}</TableCell>
                <TableCell>{chp.patientCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Chps;
