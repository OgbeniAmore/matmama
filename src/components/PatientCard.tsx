import { Patient, Status } from "@/types";
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

interface PatientCardProps {
  patient: Patient;
  onView: (patient: Patient) => void;
  onEdit: (patient: Patient) => void;
  onDelete: (patientId: string) => void;
}

export const PatientCard = ({ patient, onView, onEdit, onDelete }: PatientCardProps) => {
  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{patient.name}</CardTitle>
              <CardDescription>{patient.service}</CardDescription>
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
              <DropdownMenuItem onSelect={() => onView(patient)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onEdit(patient)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onSelect={() => onDelete(patient.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        {patient.service === "Routine Immunization" && patient.childName && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              {patient.childName} (DOB:{" "}
              {patient.childDob ? format(patient.childDob, "PP") : "N/A"})
            </span>
          </div>
        )}
        {patient.service === "Antenatal Care" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="h-4 w-4" />
            <span>
              Trimester: {patient.trimester || "N/A"} (EDD:{" "}
              {patient.edd ? format(patient.edd, "PP") : "N/A"})
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Due: {format(patient.dueDate, "PPP")}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Badge
          className={cn("capitalize font-semibold", statusColors[patient.status])}
          variant="outline"
        >
          {patient.status}
        </Badge>
      </CardFooter>
    </Card>
  );
};
