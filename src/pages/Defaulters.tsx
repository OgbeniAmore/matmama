
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Client } from "@/types";
import GoogleMapModal from "@/components/GoogleMapModal";
import { AIReminderDialog } from "@/components/AIReminderDialog";
import { BulkReminderDialog } from "@/components/BulkReminderDialog";
import { DefaultersTable } from "@/components/defaulters/DefaultersTable";
import { ViewClientSheet } from "@/components/ViewClientSheet";
import { fetchDefaulters } from "@/queries/defaulters";
import { Button } from "@/components/ui/button";
import { Bot, X, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Defaulters = () => {
  const { data: defaulters = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["defaulters"],
    queryFn: fetchDefaulters,
  });
  const { role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = role === "program_manager" || role === "system_admin";

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("auto_detect_defaulters" as any);
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast({
        title: "Defaulter Check Complete",
        description: count > 0
          ? `${count} client(s) marked as defaulting.`
          : "No new defaulters found.",
      });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const resyncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("auto_resync_clients" as any);
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      toast({
        title: "Resync Complete",
        description: `${count ?? 0} client(s) re-evaluated. Clients with future visits moved back to On Track.`,
      });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isAIReminderOpen, setIsAIReminderOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);

  const selectedClients = defaulters.filter(d => selectedIds.has(d.id));

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
    setSelectedAddress(address);
    setIsMapModalOpen(true);
  };

  const handleAIReminder = (client: Client) => {
    setSelectedClient(client);
    setIsAIReminderOpen(true);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsViewSheetOpen(true);
  };

  const handleEditClient = (client: Client) => {
    // TODO: wire up edit
  };

  const handleBulkReminderComplete = () => {
    setSelectedIds(new Set());
  };

  if (error) {
    return <div className="text-destructive p-4">Error loading defaulters: {error.message}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Defaulters</h1>
          <p className="text-muted-foreground">A list of clients who have defaulted on their schedule.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => resyncMutation.mutate()}
              disabled={resyncMutation.isPending}
              className="gap-2"
            >
              {resyncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Resync Statuses
            </Button>
            <Button
              variant="outline"
              onClick={() => runCheckMutation.mutate()}
              disabled={runCheckMutation.isPending}
              className="gap-2"
            >
              {runCheckMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Run Defaulter Check
            </Button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => setIsBulkReminderOpen(true)}
            className="gap-1.5"
          >
            <Bot className="h-4 w-4" />
            Send AI Reminder to All
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="gap-1.5 ml-auto"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      <DefaultersTable
        defaulters={defaulters}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onCall={handleCall}
        onSms={handleSms}
        onWhatsApp={handleWhatsApp}
        onFindClient={handleFindClient}
        onAIReminder={handleAIReminder}
        onViewDetails={handleViewDetails}
      />

      <GoogleMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        address={selectedAddress}
      />
      <AIReminderDialog
        client={selectedClient}
        open={isAIReminderOpen}
        onOpenChange={setIsAIReminderOpen}
      />
      <BulkReminderDialog
        clients={selectedClients}
        open={isBulkReminderOpen}
        onOpenChange={setIsBulkReminderOpen}
        onComplete={handleBulkReminderComplete}
      />
      <ViewClientSheet
        client={selectedClient}
        open={isViewSheetOpen}
        onOpenChange={setIsViewSheetOpen}
        onEdit={handleEditClient}
      />
    </div>
  );
};

export default Defaulters;
