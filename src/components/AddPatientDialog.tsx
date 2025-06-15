
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PatientForm, type PatientFormValues } from "./PatientForm";
import { Patient } from "@/types";

interface AddPatientDialogProps {
  onSave: (data: PatientFormValues, patientId?: string) => void;
  patientToEdit?: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPatientDialog({ onSave, patientToEdit, open, onOpenChange }: AddPatientDialogProps) {
  const isEditMode = !!patientToEdit;

  const handleSave = (data: PatientFormValues) => {
    onSave(data, patientToEdit?.id);
  };

  const handleFinished = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Patient" : "Add New Patient"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the patient's details below." : "Fill in the details below to add a new patient."}
          </DialogDescription>
        </DialogHeader>
        <PatientForm
          onSave={handleSave}
          patientToEdit={patientToEdit}
          onFinished={handleFinished}
          open={open}
        />
      </DialogContent>
    </Dialog>
  );
}
