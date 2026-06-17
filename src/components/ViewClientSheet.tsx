
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ViewClientSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (client: Client) => void;
}

export function ViewClientSheet({ client, open, onOpenChange, onEdit }: ViewClientSheetProps) {
  const { accountId, facilityId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAIReminderOpen, setIsAIReminderOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapAddress, setMapAddress] = useState<string | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [targetFacilityId, setTargetFacilityId] = useState("");
  const [transferNotes, setTransferNotes] = useState("");

  const { data: facilities = [] } = useQuery({
    queryKey: ["facilities-for-transfer"],
    queryFn: async () => {
      const { data, error } = await supabase.from("facilities").select("id, name, account_id").order("name");
      if (error) throw error;
      return data;
    },
    enabled: isTransferOpen,
  });

  const transferableFacilities = facilities.filter((f) => f.id !== client?.facility_id);

  const initiateTransferMutation = useMutation({
    mutationFn: async () => {
      if (!client || !targetFacilityId) throw new Error("Missing required fields");
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const targetFacility = facilities.find((f) => f.id === targetFacilityId);
      const { data: transferData, error } = await supabase.from("transfer_requests").insert({
        client_id: client.id,
        source_facility_id: client.facility_id!,
        source_account_id: client.account_id!,
        target_facility_id: targetFacilityId,
        target_account_id: targetFacility?.account_id ?? accountId!,
        requested_by: userId,
        notes: transferNotes || null,
      }).select("id").single();
      if (error) throw error;
      await supabase.functions.invoke("notify-transfer", {
        body: { transferId: transferData.id, event: "created" },
      });
    },
    onSuccess: () => {
      toast({ title: "Transfer Requested", description: "The transfer request has been submitted." });
      setIsTransferOpen(false);
      setTargetFacilityId("");
      setTransferNotes("");
      queryClient.invalidateQueries({ queryKey: ["client-transfer-history", client?.id] });
      queryClient.invalidateQueries({ queryKey: ["transfer-requests"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

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
                  {client.lmp && (
                    <>
                      <h3 className="text-sm font-medium text-muted-foreground">LMP (Last Menstrual Period)</h3>
                      <p className="col-start-2">{format(client.lmp, "PPP")}</p>

                      <h3 className="text-sm font-medium text-muted-foreground">Gestational Age</h3>
                      <p className="col-start-2">
                        {Math.max(0, Math.floor((Date.now() - client.lmp.getTime()) / (1000 * 60 * 60 * 24 * 7)))} weeks
                      </p>
                    </>
                  )}

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

                  <h3 className="text-sm font-medium text-muted-foreground">ANC Visits</h3>
                  <p className="col-start-2">8 (WHO standard)</p>
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

              <h3 className="text-sm font-medium text-muted-foreground">Reminder Channel</h3>
              <p className="col-start-2 capitalize">{client.preferred_channel || "SMS"}</p>

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

            {/* Transfer History */}
            <Separator />
            <TransferHistoryView clientId={client.id} />
          </div>
        </ScrollArea>
        <SheetFooter className="pt-4 flex flex-row gap-2 sm:justify-start">
          <Button type="button" onClick={handleEditClick}>Edit Client</Button>
          {client.facility_id && client.account_id && (
            <Button type="button" variant="outline" onClick={() => setIsTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer Client
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>

    <Dialog open={isTransferOpen} onOpenChange={(o) => { setIsTransferOpen(o); if (!o) { setTargetFacilityId(""); setTransferNotes(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer {client.name}</DialogTitle>
          <DialogDescription>
            Create a transfer request to move this client to another facility. The request will be pending until approved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Target Facility</Label>
            <Select value={targetFacilityId} onValueChange={setTargetFacilityId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination facility" />
              </SelectTrigger>
              <SelectContent>
                {transferableFacilities.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Reason for transfer or additional context…"
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTransferOpen(false)}>Cancel</Button>
          <Button
            onClick={() => initiateTransferMutation.mutate()}
            disabled={!targetFacilityId || initiateTransferMutation.isPending}
          >
            {initiateTransferMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
