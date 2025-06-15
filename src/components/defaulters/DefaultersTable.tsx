
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Client, Status } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DefaulterActions } from "./DefaulterActions";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800",
  Defaulting: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

interface DefaultersTableProps {
  defaulters: Client[];
  isLoading: boolean;
  onCall: (contact: string) => void;
  onSms: (contact: string) => void;
  onWhatsApp: (contact: string) => void;
  onFindClient: (address: string) => void;
  onAIReminder: (client: Client) => void;
}

export const DefaultersTable = ({
  defaulters,
  isLoading,
  onCall,
  onSms,
  onWhatsApp,
  onFindClient,
  onAIReminder
}: DefaultersTableProps) => {
  return (
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
          ) : (
            defaulters.map((client) => (
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
                  <DefaulterActions
                    client={client}
                    onCall={onCall}
                    onSms={onSms}
                    onWhatsApp={onWhatsApp}
                    onFindClient={onFindClient}
                    onAIReminder={onAIReminder}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
