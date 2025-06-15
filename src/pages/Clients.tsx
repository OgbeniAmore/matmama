
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Client, Status, EpiSchedule } from "@/types";
import { AddClientDialog } from "@/components/AddClientDialog";
import { type ClientFormValues } from "@/components/ClientForm";
import { ViewClientSheet } from "@/components/ViewClientSheet";
import { useToast } from "@/hooks/use-toast";
import { generateImmunizationSchedule } from "@/utils/immunizationUtils";
import { ClientCard } from "@/components/ClientCard";
import { ClientCardSkeleton } from "@/components/ClientCardSkeleton";

const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
    throw new Error(error.message);
  }

  return data.map((p) => ({
    ...p,
    dueDate: new Date(p.due_date),
    assignedTo: p.assigned_to,
    childDob: p.child_dob ? new Date(p.child_dob) : undefined,
    childName: p.child_name || undefined,
    trimester: p.trimester || undefined,
    edd: p.edd ? new Date(p.edd) : undefined,
  }));
};

const fetchEpiSchedule = async (): Promise<EpiSchedule[]> => {
  const { data, error } = await supabase
    .from("epi_schedule")
    .select("*")
    .order("age_weeks", { ascending: true });

  if (error) {
    console.error("Error fetching EPI schedule:", error);
    throw new Error(error.message);
  }

  return data;
};

const Clients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  const { data: epiSchedule = [] } = useQuery<EpiSchedule[]>({
    queryKey: ["epi-schedule"],
    queryFn: fetchEpiSchedule,
  });

  const saveClientMutation = useMutation({
    mutationFn: async ({
      data,
      clientId,
    }: {
      data: ClientFormValues;
      clientId?: string;
    }) => {
      const clientDataForSupabase = {
        name: data.name,
        service: data.service,
        due_date: data.dueDate.toISOString(),
        contact: data.contact,
        address: data.address,
        assigned_to: 'System', // Default value since field is removed
        child_name: data.childName || null,
        child_dob: data.childDob ? data.childDob.toISOString().split('T')[0] : null,
        trimester: data.trimester || null,
        edd: data.edd ? data.edd.toISOString().split('T')[0] : null,
      };

      if (clientId) {
        const { error } = await supabase
          .from("clients")
          .update(clientDataForSupabase)
          .eq("id", clientId);
        if (error) throw error;
      } else {
        const newClientId = `CLI${String(Date.now()).slice(-6)}`;
        const newClientData = {
          ...clientDataForSupabase,
          id: newClientId,
          status: "On Track" as Status,
        };
        
        const { error: clientError } = await supabase.from("clients").insert(newClientData);
        if (clientError) throw clientError;

        if (data.service === "Routine Immunization" && data.childDob) {
          const immunizationSchedule = generateImmunizationSchedule(
            data.childDob,
            epiSchedule,
            newClientId
          );

          if (immunizationSchedule.length > 0) {
            const { error: scheduleError } = await supabase
              .from("immunization_records")
              .insert(immunizationSchedule);
            
            if (scheduleError) {
              console.error("Error creating immunization schedule:", scheduleError);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      toast({
        title: "Success",
        description: clientToEdit ? "Client updated successfully" : "Client added successfully with immunization schedule",
      });
    },
    onError: (error: Error, { clientId }) => {
      toast({
        title: "Error",
        description: `Failed to ${
          clientId ? "update" : "add"
        } client. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveClient = (data: ClientFormValues, clientId?: string) => {
    saveClientMutation.mutate({ data, clientId });
  };
  
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
        const { error } = await supabase.from('clients').delete().eq('id', clientId);
        if (error) throw error;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['defaulters'] });
        toast({
            title: "Client Deleted",
            description: "The client has been successfully deleted.",
        });
    },
    onError: (error: Error) => {
        toast({
            title: "Error",
            description: `Failed to delete client. ${error.message}`,
            variant: "destructive",
        });
    }
  });

  const handleDeleteClient = (clientId: string) => {
    if (window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
        deleteClientMutation.mutate(clientId);
    }
  };

  const openAddForm = () => {
    setClientToEdit(null);
    setIsFormOpen(true);
  };

  const openEditForm = (client: Client) => {
    setClientToEdit(client);
    setIsFormOpen(true);
  };

  const openViewSheet = (client: Client) => {
    setSelectedClient(client);
    setIsViewSheetOpen(true);
  }

  if (error) {
    return <div className="text-red-500 p-4">Error loading clients: {error.message}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Clients</h1>
            <p className="text-muted-foreground">Manage all clients in the system.</p>
        </div>
        <Button onClick={openAddForm}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Client
        </Button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <ClientCardSkeleton key={i} />
            ))}
        </div>
      ) : clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
                <ClientCard
                    key={client.id}
                    client={client}
                    onView={openViewSheet}
                    onEdit={openEditForm}
                    onDelete={handleDeleteClient}
                />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center">
            <h2 className="text-2xl font-bold tracking-tight">No clients yet</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">
                You can start managing clients by clicking the button below to add your first one.
            </p>
            <Button onClick={openAddForm} className="mt-6">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Client
            </Button>
        </div>
      )}

      <ViewClientSheet
        client={selectedClient}
        open={isViewSheetOpen}
        onOpenChange={setIsViewSheetOpen}
        onEdit={openEditForm}
      />
      <AddClientDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
        onSave={handleSaveClient}
      />
    </div>
  );
};

export default Clients;
