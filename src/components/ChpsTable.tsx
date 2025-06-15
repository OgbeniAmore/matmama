
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChpTableRow } from "./ChpTableRow";

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

interface ChpsTableProps {
  chpsData: ChpData[];
  isLoading: boolean;
  onEditChp: (chp: ChpData) => void;
}

export function ChpsTable({ chpsData, isLoading, onEditChp }: ChpsTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Facility</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Assigned Patients</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>Loading...</TableCell>
                <TableCell>Loading...</TableCell>
                <TableCell>Loading...</TableCell>
                <TableCell>Loading...</TableCell>
                <TableCell className="text-right">Loading...</TableCell>
              </TableRow>
            ))
          ) : (
            chpsData.map((chp) => (
              <ChpTableRow key={chp.id} chp={chp} onEdit={onEditChp} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
