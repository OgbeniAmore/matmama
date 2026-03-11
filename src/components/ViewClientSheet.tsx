
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Client } from "@/types";
import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { ImmunizationScheduleView } from "./clients/ImmunizationScheduleView";
import { AncScheduleView } from "./clients/AncScheduleView";
import { TransferHistoryView } from "./clients/TransferHistoryView";
import { ClientActionBar } from "./ClientActionBar";
import { AIReminderDialog } from "./AIReminderDialog";
import GoogleMapModal from "./GoogleMapModal";

interface ViewClientSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
}

export function ViewClientSheet({ client, open, onOpenChange, onEdit }: ViewClientSheetProps) {
  const [isAIReminderOpen, setIsAIReminderOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapAddress, setMapAddress] = useState<string | null>(null);

  if (!client) return null;

  const handleEditClick = () => {
    onOpenChange(false);
    onEdit(client);
  };

  const handleCall = (contact: string) => {
    window.location.href = `tel:${contact}`;
  };

  const handleSms = (contact: string) => {
    window.location.href = `sms:${contact}`;
  };

  const handleWhatsApp = (contact: string) => {
    window.open(`https://wa.me/${contact}`, '_blank');
  };

  const handleFindClient = (address: string) => {
    setMapAddress(address);
    setIsMapOpen(true);
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-[90vw] flex flex-col">
        <SheetHeader>
          <SheetTitle>{client.name}</SheetTitle>
          <SheetDescription>
            Client ID: {client.id}
          </SheetDescription>
        </SheetHeader>

        {/* Action buttons above details */}
        <div className="py-2">
          <ClientActionBar
            client={client}
            onAIReminder={() => setIsAIReminderOpen(true)}
            onCall={handleCall}
            onSms={handleSms}
            onWhatsApp={handleWhatsApp}
            onFindClient={handleFindClient}
          />
        </div>

        <Separator />

        <ScrollArea className="flex-grow">
          <div className="space-y-4 pr-6 py-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Service</h3>
              <p className="col-start-2">{client.service}</p>

              {client.service === "Routine Immunization" && client.childName && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">Child Name</h3>
                  <p className="col-start-2">{client.childName}</p>

                  {client.childDob && (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground">Child Date of Birth</h3>
                      <p className="col-start-2">{format(client.childDob, "PPP")}</p>
                    </>
                  )}
                </>
              )}

              {client.service === "Ante Natal Care" && (
                <>
                  {client.trimester && (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground">Trimester</h3>
                      <p className="col-start-2">
                        {client.trimester === 1 && "First Trimester (1-12 weeks)"}
                        {client.trimester === 2 && "Second Trimester (13-26 weeks)"}
                        {client.trimester === 3 && "Third Trimester (27-40 weeks)"}
                      </p>
                    </>
                  )}

                  {client.edd && (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground">Estimated Due Date (EDD)</h3>
                      <p className="col-start-2">{format(client.edd, "PPP")}</p>
                    </>
                  )}
                </>
              )}

              <h3 className="text-sm font-medium text-muted-foreground">
                {client.service === "Routine Immunization" ? "Next Immunization" : 
                 client.service === "Ante Natal Care" ? "Next Appointment" : 
                 "Due Date"}
              </h3>
              <p className="col-start-2">{format(client.dueDate, "PPP")}</p>
              
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <p className="col-start-2">{client.status}</p>

              <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
              <p className="col-start-2">{client.contact}</p>

              {client.lasraa_id && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">LASRAA ID</h3>
                  <p className="col-start-2">{client.lasraa_id}</p>
                </>
              )}
              {client.nin_id && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">NIN</h3>
                  <p className="col-start-2">{client.nin_id}</p>
                </>
              )}
              {client.system_id && (
                <>
                  <h3 className="text-sm font-medium text-muted-foreground">System ID</h3>
                  <p className="col-start-2">{client.system_id}</p>
                </>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
              <p className="whitespace-pre-wrap">{client.address}</p>
            </div>

            {/* Show immunization or ANC schedule based on service type */}
            {client.service === "Routine Immunization" && (
              <>
                <Separator />
                <ImmunizationScheduleView clientId={client.id} />
              </>
            )}

            {client.service === "Ante Natal Care" && (
              <>
                <Separator />
                <AncScheduleView clientId={client.id} />
              </>
            )}
          </div>
        </ScrollArea>
        <SheetFooter className="pt-4">
          <Button type="button" onClick={handleEditClick}>Edit Client</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <AIReminderDialog
      client={client}
      open={isAIReminderOpen}
      onOpenChange={setIsAIReminderOpen}
    />
    <GoogleMapModal
      isOpen={isMapOpen}
      onClose={() => setIsMapOpen(false)}
      address={mapAddress}
    />
    </>
  );
}
