import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PhoneCall, Send, MapPin, Bot } from "lucide-react";
import { Client, Status } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MapModal from "@/components/MapModal";
import { Skeleton } from "@/components/ui/skeleton";
import { AIReminderDialog } from "@/components/AIReminderDialog";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800",
  Defaulting: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

const fetchDefaulters = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "Defaulting")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching defaulters:", error);
    throw new Error(error.message);
  }

  return data.map((p) => ({
    ...p,
    dueDate: new Date(p.due_date),
    assignedTo: p.assigned_to,
    childDob: p.child_dob ? new Date(p.child_dob) : undefined,
    childName: p.child_name || undefined,
    edd: p.edd ? new Date(p.edd) : undefined,
  }));
};

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
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
            ) : defaulters.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.service}</TableCell>
                <TableCell>{format(client.dueDate, "PPP")}</TableCell>
                <TableCell>
                  <Badge className={cn("capitalize", statusColors[client.status])} variant="outline">
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAIReminder(client)}>
                        <Bot className="mr-2 h-4 w-4" />
                        <span>Send AI Reminder</span>
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Send className="mr-2 h-4 w-4" />
                          <span>Manual Reminder</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => handleCall(client.contact)}>
                              <PhoneCall className="mr-2 h-4 w-4" />
                              <span>Call</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSms(client.contact)}>
                              <Send className="mr-2 h-4 w-4" />
                              <span>SMS</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleWhatsApp(client.contact)}>
                              <Send className="mr-2 h-4 w-4" />
                              <span>WhatsApp</span>
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => handleFindClient(client.address)}>
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>Find/Visit Client</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
