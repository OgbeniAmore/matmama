
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChpForm, ChpFormValues } from "./ChpForm";
import { CHP } from "@/pages/CHPs";

interface AddEditChpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ChpFormValues, chpId?: string) => void;
  chp: CHP | null;
  isSubmitting: boolean;
}

export const AddEditChpDialog = ({
  isOpen,
  onClose,
  onSubmit,
  chp,
  isSubmitting,
}: AddEditChpDialogProps) => {
  const handleFormSubmit = (values: ChpFormValues) => {
    onSubmit(values, chp?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{chp ? "Edit CHP" : "Add New CHP"}</DialogTitle>
          <DialogDescription>
            {chp
              ? "Make changes to the CHP's profile. Click save when you're done."
              : "Fill in the details to add a new Community Health Practitioner."}
          </DialogDescription>
        </DialogHeader>
        <ChpForm
          onSubmit={handleFormSubmit}
          defaultValues={chp ?? undefined}
          isSubmitting={isSubmitting}
          isEditMode={!!chp}
        />
      </DialogContent>
    </Dialog>
  );
};
