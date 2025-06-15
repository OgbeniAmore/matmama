
import { useState } from "react";
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
import { MoreHorizontal } from "lucide-react";
import { patients as initialPatients } from "@/data/patients";
import { Patient, Status } from "@/types";
import { format } from "date-fns";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { cn } from "@/lib/utils";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800",
  Defaulting: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);

  const handlePatientAdded = () => {
    // In a real app, you'd refetch the data. Here we'll just log it.
    console.log("A new patient was added, you would refetch data here.");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Patients</h1>
            <p className="text-muted-foreground">Manage all patients in the system.</p>
        </div>
        <AddPatientDialog onPatientAdded={handlePatientAdded} />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.service}</TableCell>
                <TableCell>{format(patient.dueDate, "PPP")}</TableCell>
                <TableCell>
                  <Badge className={cn("capitalize", statusColors[patient.status])} variant="outline">
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell>{patient.assignedTo}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
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
    </div>
  );
};

export default Patients;
