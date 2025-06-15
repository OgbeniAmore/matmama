
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
import { Patient, Status } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import MapModal from "@/components/MapModal";
import { Skeleton } from "@/components/ui/skeleton";
import { AIReminderDialog } from "@/components/AIReminderDialog";
import { CHPsList } from "@/components/CHPsList";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800",
  Defaulting: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

const fetchDefaulters = async (): Promise<Patient[]> => {
  const { data, error } = await supabase
    .from("patients")
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
  const { data: defaulters = [], isLoading, error } = useQuery<Patient[]>({
    queryKey: ["defaulters"],
    queryFn: fetchDefaulters,
  });

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isAIReminderOpen, setIsAIReminderOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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

  const handleAIReminder = (patient: Patient) => {
    setSelectedPatient(patient);
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
            <p className="text-muted-foreground">A list of patients who have defaulted on their schedule.</p>
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
              <TableHead>Assigned To</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
            ) : defaulters.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.service}</TableCell>
                <TableCell>{format(patient.dueDate, "PPP")}</TableCell>
                <TableCell>
                  <Badge className={cn("capitalize", statusColors[patient.status])} variant="outline">
                    {patient.status}
                  </Badge>
                </TableCell>
                <TableCell>{patient.assignedTo}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleAIReminder(patient)}>
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
                            <DropdownMenuItem onClick={() => handleCall(patient.contact)}>
                              <PhoneCall className="mr-2 h-4 w-4" />
                              <span>Call</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSms(patient.contact)}>
                              <Send className="mr-2 h-4 w-4" />
                              <span>SMS</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleWhatsApp(patient.contact)}>
                              <Send className="mr-2 h-4 w-4" />
                              <span>WhatsApp</span>
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => handleFindClient(patient.address)}>
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

      {/* CHPs List Section */}
      <CHPsList />

      <MapModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        address={selectedAddress}
      />
      <AIReminderDialog
        patient={selectedPatient}
        open={isAIReminderOpen}
        onOpenChange={setIsAIReminderOpen}
      />
    </div>
  );
};

export default Defaulters;
