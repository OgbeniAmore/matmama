
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

interface Chp {
  name: string;
  patientCount: number;
}

const Chps = () => {
  const [patients] = useState<Patient[]>(initialPatients);

  const chpsData: Chp[] = useMemo(() => {
    const chpNames = [...new Set(patients.map((p) => p.assignedTo))];
    return chpNames.map((name) => ({
      name,
      patientCount: patients.filter((p) => p.assignedTo === name).length,
    }));
  }, [patients]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CHPs</h1>
          <p className="text-muted-foreground">
            A list of Community Health Providers and their assigned patients.
          </p>
        </div>
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
