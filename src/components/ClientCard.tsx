
import { Client, Status } from "@/types";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, User, Calendar, Stethoscope, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LastActor } from "@/queries/auditActors";

const statusColors: Record<Status, string> = {
  "On Track": "bg-status-ontrack/10 text-status-ontrack border-status-ontrack/20 hover:bg-status-ontrack/10",
  "Defaulting": "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10",
  "Completed": "bg-status-completed/10 text-status-completed border-status-completed/20 hover:bg-status-completed/10",
};

interface ClientCardProps {
  client: Client;
  lastActor?: LastActor;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
}

export const ClientCard = ({ client, lastActor, onView, onEdit, onDelete }: ClientCardProps) => {

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onView(client)}
              className="bg-primary/10 p-2 rounded-full shrink-0"
              aria-label={`View details for ${client.name}`}
            >
              <User className="h-5 w-5 text-primary" />
            </button>
            <div className="min-w-0">
              <CardTitle className="text-lg">
                <button
                  type="button"
                  onClick={() => onView(client)}
                  className="text-left hover:text-primary hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm truncate max-w-full"
                  title={`View ${client.name}'s details`}
                >
                  {client.name}
                </button>
              </CardTitle>
              <CardDescription>{client.service}</CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onView(client)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(client)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onSelect={() => onDelete(client.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        {client.service === "Routine Immunization" && client.childName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              {client.childName} (DOB:{" "}
              {client.childDob ? format(client.childDob, "PP") : "N/A"})
            </span>
          </div>
        )}
        {client.service === "Ante Natal Care" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="h-4 w-4" />
            <span>
              Trimester: {client.trimester || "N/A"} (EDD:{" "}
              {client.edd ? format(client.edd, "PP") : "N/A"})
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Due: {format(client.dueDate, "PPP")}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn("capitalize font-semibold", statusColors[client.status])}
          variant="outline"
        >
          {client.status}
        </Badge>
        {lastActor && (
          <Badge variant="secondary" className="gap-1 font-normal">
            <UserCheck className="h-3 w-3" />
            <span className="truncate max-w-[160px]">
              Last updated by {lastActor.name}
              {lastActor.designation ? ` (${lastActor.designation})` : ""} · {format(new Date(lastActor.at), "MMM d")}
            </span>
          </Badge>
        )}
      </CardFooter>

    </Card>
  );
};
