
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
import { MoreHorizontal, User, Calendar, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<Status, string> = {
  "On Track": "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  "Defaulting": "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  "Completed": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
};

interface ClientCardProps {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
}

export const ClientCard = ({ client, onView, onEdit, onDelete }: ClientCardProps) => {
  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{client.name}</CardTitle>
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
      <CardFooter>
        <Badge
          className={cn("capitalize font-semibold", statusColors[client.status])}
          variant="outline"
        >
          {client.status}
        </Badge>
      </CardFooter>
    </Card>
  );
};
