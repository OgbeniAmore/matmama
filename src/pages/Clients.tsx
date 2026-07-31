
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { Client, EpiSchedule } from "@/types";
import { AddClientDialog } from "@/components/AddClientDialog";
import { type ClientFormValues } from "@/components/ClientForm";
import { ViewClientSheet } from "@/components/ViewClientSheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import {
  fetchClients,
  fetchEpiSchedule,
  saveClient,
  deleteClient,
} from "@/queries/clients";
import { ClientGrid } from "@/components/clients/ClientGrid";
import { fetchClientLastActors } from "@/queries/auditActors";


const Clients = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { accountId, facilityId, role, profile } = useAuth();
  const { requireWorker, logAction } = useActiveWorker();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 18;

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

  const { data: lastActors = {} } = useQuery({
    queryKey: ["client-last-actors"],
    queryFn: fetchClientLastActors,
  });


  const assignedTo = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : 'System';

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return !q ||
      c.name.toLowerCase().includes(q) ||
      c.contact.includes(q) ||
      c.service.toLowerCase().includes(q) ||
      (c.childName && c.childName.toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const paginatedClients = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const saveClientMutation = useMutation({
    mutationFn: (variables: { data: ClientFormValues; clientId?: string }) =>
      saveClient({ ...variables, epiSchedule, accountId: accountId!, facilityId: facilityId!, assignedTo }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      logAction(
        variables.clientId ? "UPDATE_CLIENT" : "CREATE_CLIENT",
        "clients",
        variables.clientId ?? null,
        { client_name: variables.data.name, service: variables.data.service },
      );
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

  const handleSaveClient = async (data: ClientFormValues, clientId?: string) => {
    const worker = await requireWorker();
    if (!worker) return;
    saveClientMutation.mutate({ data, clientId });
  };

  const deleteClientMutation = useMutation({
    mutationFn: deleteClient,
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      logAction("DELETE_CLIENT", "clients", clientId);
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

  const handleDeleteClient = async (clientId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this client? This action cannot be undone."
      )
    ) {
      const worker = await requireWorker();
      if (!worker) return;
      deleteClientMutation.mutate(clientId);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Auto-open client detail from URL param
  useEffect(() => {
    const viewId = searchParams.get("view");
    if (viewId && clients.length > 0) {
      const client = clients.find((c) => c.id === viewId);
      if (client) {
        setSelectedClient(client);
        setIsViewSheetOpen(true);
        searchParams.delete("view");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, clients]);

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
    <div className="space-y-6">
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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, phone, service…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ClientGrid
        clients={paginatedClients}
        isLoading={isLoading}
        lastActors={lastActors}
        onView={openViewSheet}
        onEdit={openEditForm}
        onDelete={handleDeleteClient}
        onAddClient={openAddForm}
      />


      {!isLoading && filteredClients.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredClients.length)} of {filteredClients.length} clients
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
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
