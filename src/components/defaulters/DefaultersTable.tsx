
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
import { Checkbox } from "@/components/ui/checkbox";
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
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCall: (contact: string) => void;
  onSms: (contact: string) => void;
  onWhatsApp: (contact: string) => void;
  onFindClient: (address: string) => void;
  onAIReminder: (client: Client) => void;
  onViewDetails?: (client: Client) => void;
}

export const DefaultersTable = ({
  defaulters,
  isLoading,
  selectedIds,
  onSelectionChange,
  onCall,
  onSms,
  onWhatsApp,
  onFindClient,
  onAIReminder,
  onViewDetails,
}: DefaultersTableProps) => {
  const allSelected = defaulters.length > 0 && selectedIds.size === defaulters.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < defaulters.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(defaulters.map(d => d.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  return (
    <>
    <div className="space-y-3 md:hidden">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <Checkbox checked={allSelected ? true : someSelected ? "indeterminate" : false} onCheckedChange={toggleAll} aria-label="Select all" />Select all
      </label>
      {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />) : defaulters.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No defaulters found.</p>
      ) : defaulters.map((client) => (
        <div key={client.id} className={cn("rounded-lg border bg-card p-4 space-y-2", selectedIds.has(client.id) && "bg-muted/50")}>
          <div className="flex items-start gap-3">
            <div className="flex min-h-11 items-center"><Checkbox checked={selectedIds.has(client.id)} onCheckedChange={() => toggleOne(client.id)} aria-label={`Select ${client.name}`} /></div>
            <div className="flex-1 min-w-0"><p className="font-medium break-words">{client.name}</p><p className="text-sm text-muted-foreground break-words">{client.service}</p></div>
            <DefaulterActions client={client} onCall={onCall} onSms={onSms} onWhatsApp={onWhatsApp} onFindClient={onFindClient} onAIReminder={onAIReminder} onViewDetails={onViewDetails} />
          </div>
          <p className="text-sm">Due: {format(client.dueDate, "PPP")}</p>
          <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">{client.status}</Badge>
        </div>
      ))}
    </div>
    <div className="hidden md:block border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
            </TableHead>
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
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))
          ) : defaulters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No defaulters found.
              </TableCell>
            </TableRow>
          ) : (
            defaulters.map((client) => (
              <TableRow
                key={client.id}
                className={cn(selectedIds.has(client.id) && "bg-muted/50")}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(client.id)}
                    onCheckedChange={() => toggleOne(client.id)}
                    aria-label={`Select ${client.name}`}
                  />
                </TableCell>
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
                    onViewDetails={onViewDetails}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
    </>
  );
};
