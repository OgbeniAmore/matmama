
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChpForm, ChpFormValues } from "@/components/ChpForm";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  facility: string | null;
  local_government: string | null;
  ward: string | null;
}

interface ChpData extends Profile {
  patientCount: number;
}

interface ChpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  chpToEdit: ChpData | null;
  onSave: (data: ChpFormValues) => boolean;
  onFinished: () => void;
}

const getDisplayName = (chp: Profile) => {
  const name = [chp.first_name, chp.last_name].filter(Boolean).join(" ");
  return name || "Unknown User";
};

export function ChpDialog({ 
  isOpen, 
  onOpenChange, 
  chpToEdit, 
  onSave, 
  onFinished 
}: ChpDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          onSave={onSave}
          onFinished={onFinished}
          open={isOpen}
          initialValues={chpToEdit ? { 
            name: getDisplayName(chpToEdit), 
            contact: ""
          } : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
