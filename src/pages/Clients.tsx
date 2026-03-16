
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Client, EpiSchedule } from "@/types";
import { AddClientDialog } from "@/components/AddClientDialog";
import { type ClientFormValues } from "@/components/ClientForm";
import { ViewClientSheet } from "@/components/ViewClientSheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchClients,
  fetchEpiSchedule,
  saveClient,
  deleteClient,
} from "@/queries/clients";
import { ClientGrid } from "@/components/clients/ClientGrid";

const Clients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { accountId, facilityId, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
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
    mutationFn: (variables: { data: ClientFormValues; clientId?: string }) =>
      saveClient({ ...variables, epiSchedule, accountId: accountId!, facilityId: facilityId! }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      toast({
        title: "Success",
        description: variables.clientId
          ? "Client updated successfully"
          : "Client added successfully with immunization schedule",
      });
    },
    onError: (error: Error, variables) => {
      toast({
        title: "Error",
        description: `Failed to ${
          variables.clientId ? "update" : "add"
        } client. ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveClient = (data: ClientFormValues, clientId?: string) => {
    saveClientMutation.mutate({ data, clientId });
  };

  const deleteClientMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
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
    },
  });

  const handleDeleteClient = (clientId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this client? This action cannot be undone."
      )
    ) {
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
  };

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading clients: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage all clients in the system.
          </p>
        </div>
        <Button onClick={openAddForm}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Client
        </Button>
      </div>

      <ClientGrid
        clients={clients}
        isLoading={isLoading}
        onView={openViewSheet}
        onEdit={openEditForm}
        onDelete={handleDeleteClient}
        onAddClient={openAddForm}
      />

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
