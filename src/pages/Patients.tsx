
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
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { patients as initialPatients } from "@/data/patients";
import { Patient, Status } from "@/types";
import { format } from "date-fns";
import { AddPatientDialog } from "@/components/AddPatientDialog";
import { type PatientFormValues } from "@/components/PatientForm";
import { cn } from "@/lib/utils";
import { ViewPatientSheet } from "@/components/ViewPatientSheet";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800",
  Defaulting: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

const Patients = () => {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<Patient | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSavePatient = (data: PatientFormValues, patientId?: string) => {
    if (patientId) {
      setPatients(prevPatients =>
        prevPatients.map(p => (p.id === patientId ? { ...p, ...data } : p))
      );
    } else {
      const newPatient: Patient = {
        id: `PAT${String(patients.length + 1).padStart(3, "0")}`,
        name: data.name,
        service: data.service,
        dueDate: data.dueDate,
        contact: data.contact,
        address: data.address,
        status: "On Track",
        assignedTo: "Dr. Kemi",
      };
      setPatients(prevPatients => [...prevPatients, newPatient]);
    }
    setIsFormOpen(false);
    setPatientToEdit(null);
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
                      <DropdownMenuItem onSelect={() => openViewSheet(patient)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openEditForm(patient)}>Edit</DropdownMenuItem>
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
      <ViewPatientSheet
        patient={selectedPatient}
        open={isViewSheetOpen}
        onOpenChange={setIsViewSheetOpen}
        onEdit={openEditForm}
      />
      <AddPatientDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        patientToEdit={patientToEdit}
        onSave={handleSavePatient}
      />
    </div>
  );
};

export default Patients;
