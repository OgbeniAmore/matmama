
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Client } from "@/types";
import MapModal from "@/components/MapModal";
import { AIReminderDialog } from "@/components/AIReminderDialog";
import { DefaultersTable } from "@/components/defaulters/DefaultersTable";
import { fetchDefaulters } from "@/queries/defaulters";

const Defaulters = () => {
  const { data: defaulters = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["defaulters"],
    queryFn: fetchDefaulters,
  });

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isAIReminderOpen, setIsAIReminderOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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

  if (error) {
    return <div className="text-red-500 p-4">Error loading defaulters: {error.message}</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Defaulters</h1>
            <p className="text-muted-foreground">A list of clients who have defaulted on their schedule.</p>
        </div>
      </div>
      
      <DefaultersTable 
        defaulters={defaulters}
        isLoading={isLoading}
        onCall={handleCall}
        onSms={handleSms}
        onWhatsApp={handleWhatsApp}
        onFindClient={handleFindClient}
        onAIReminder={handleAIReminder}
      />

      <MapModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        address={selectedAddress}
      />
      <AIReminderDialog
        client={selectedClient}
        open={isAIReminderOpen}
        onOpenChange={setIsAIReminderOpen}
      />
    </div>
  );
};

export default Defaulters;
