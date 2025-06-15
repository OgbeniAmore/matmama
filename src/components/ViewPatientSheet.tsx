
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Patient } from "@/types";
import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";

interface ViewPatientSheetProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (patient: Patient) => void;
}

export function ViewPatientSheet({ patient, open, onOpenChange, onEdit }: ViewPatientSheetProps) {
  if (!patient) return null;

  const handleEditClick = () => {
    onOpenChange(false);
    onEdit(patient);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] flex flex-col">
        <SheetHeader>
          <SheetTitle>{patient.name}</SheetTitle>
          <SheetDescription>
            Patient ID: {patient.id}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow">
          <div className="space-y-4 pr-6 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Service</h3>
              <p className="col-start-2">{patient.service}</p>

              {patient.service === "Routine Immunization" && patient.childName && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">Child Name</h3>
                  <p className="col-start-2">{patient.childName}</p>

                  {patient.childDob && (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground">Child Date of Birth</h3>
                      <p className="col-start-2">{format(patient.childDob, "PPP")}</p>
                    </>
                  )}
                </>
              )}

              <h3 className="text-sm font-medium text-muted-foreground">
                {patient.service === "Routine Immunization" ? "Next Immunization" : "Due Date"}
              </h3>
              <p className="col-start-2">{format(patient.dueDate, "PPP")}</p>
              
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <p className="col-start-2">{patient.status}</p>

              <h3 className="text-sm font-medium text-muted-foreground">Assigned To</h3>
              <p className="col-start-2">{patient.assignedTo}</p>

              <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
              <p className="col-start-2">{patient.contact}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
              <p className="whitespace-pre-wrap">{patient.address}</p>
            </div>
          </div>
        </ScrollArea>
        <SheetFooter className="pt-4">
          <Button type="button" onClick={handleEditClick}>Edit Patient</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
