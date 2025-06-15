
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Client } from "@/types";
import { ClientForm, ClientFormValues } from "@/components/ClientForm";

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientToEdit: Client | null;
  onSave: (data: ClientFormValues, clientId?: string) => void;
}

export const AddClientDialog = ({
  open,
  onOpenChange,
  clientToEdit,
  onSave,
}: AddClientDialogProps) => {
  const handleSave = (data: ClientFormValues) => {
    onSave(data, clientToEdit?.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {clientToEdit ? "Edit Client" : "Add New Client"}
          </DialogTitle>
          <DialogDescription>
            {clientToEdit
              ? "Update the client's details below."
              : "Fill in the form to add a new client to the system."}
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          open={open}
          onSave={handleSave}
          clientToEdit={clientToEdit}
          onFinished={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
