
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, MoreHorizontal } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  facility: string | null;
  local_government: string | null;
  ward: string | null;
}

interface ChpData extends Profile {
  patientCount: number;
}

interface ChpTableRowProps {
  chp: ChpData;
  onEdit: (chp: ChpData) => void;
}

const getDisplayName = (chp: Profile) => {
  const name = [chp.first_name, chp.last_name].filter(Boolean).join(" ");
  return name || "Unknown User";
};

export function ChpTableRow({ chp, onEdit }: ChpTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{getDisplayName(chp)}</TableCell>
      <TableCell>{chp.facility || "Not specified"}</TableCell>
      <TableCell>
        {[chp.ward, chp.local_government].filter(Boolean).join(", ") || "Not specified"}
      </TableCell>
      <TableCell>{chp.patientCount}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(chp)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
