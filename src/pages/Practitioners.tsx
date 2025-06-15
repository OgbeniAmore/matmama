
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

interface PractitionerData {
  name: string;
  patientCount: number;
}

const Practitioners = () => {
  const [patients] = useState<Patient[]>(initialPatients);

  const practitionersData: PractitionerData[] = useMemo(() => {
    const practitionerNames = [...new Set(patients.map((p) => p.assignedTo))];
    return practitionerNames.map((name) => ({
      name,
      patientCount: patients.filter((p) => p.assignedTo === name).length,
    }));
  }, [patients]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Practitioners</h1>
          <p className="text-muted-foreground">
            A list of Practitioners and their assigned patients.
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
            {practitionersData.map((practitioner) => (
              <TableRow key={practitioner.name}>
                <TableCell className="font-medium">{practitioner.name}</TableCell>
                <TableCell>{practitioner.patientCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Practitioners;
