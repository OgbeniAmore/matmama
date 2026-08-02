import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

export interface RosterImportRow {
  name: string;
  designation: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: string[];
  isSaving?: boolean;
  onImport: (rows: RosterImportRow[]) => void;
}

const NONE = "__none__";

const guess = (headers: string[], keys: string[]) =>
  headers.find((h) => keys.some((k) => h.toLowerCase().replace(/[^a-z]/g, "").includes(k))) ?? NONE;

export function RosterImportDialog({ open, onOpenChange, designations, isSaving, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [nameCol, setNameCol] = useState<string>(NONE);
  const [desigCol, setDesigCol] = useState<string>(NONE);
  const [fallbackDesig, setFallbackDesig] = useState<string>(designations[0] ?? "Other");

  const reset = () => {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setNameCol(NONE);
    setDesigCol(NONE);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (json.length === 0) {
        toast.error("That sheet has no rows");
        return;
      }
      const cols = Object.keys(json[0]);
      setFileName(file.name);
      setHeaders(cols);
      setRows(json);
      setNameCol(guess(cols, ["name", "fullname", "worker", "staff"]));
      setDesigCol(guess(cols, ["designation", "role", "cadre", "title", "position"]));
    } catch {
      toast.error("Could not read that file. Use a .xlsx, .xls or .csv sheet.");
    }
  };

  const mapped: RosterImportRow[] = rows
    .map((r) => ({
      name: String(nameCol !== NONE ? r[nameCol] ?? "" : "").trim(),
      designation:
        String(desigCol !== NONE ? r[desigCol] ?? "" : "").trim() || fallbackDesig,
    }))
    .filter((r) => r.name.length > 0);

  const submit = () => {
    if (mapped.length === 0) {
      toast.error("Nothing to import — pick the column that holds the worker names.");
      return;
    }
    onImport(mapped);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import roster from Excel</DialogTitle>
          <DialogDescription>
            Upload an .xlsx, .xls or .csv sheet, then match its columns to the roster fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Choose spreadsheet
            </Button>
            {fileName && (
              <span className="ml-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" /> {fileName}
              </span>
            )}
          </div>

          {headers.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Name column</Label>
                  <Select value={nameCol} onValueChange={setNameCol}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— none —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Designation column</Label>
                  <Select value={desigCol} onValueChange={setDesigCol}>
                    <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— none —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Default designation</Label>
                  <Select value={fallbackDesig} onValueChange={setFallbackDesig}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {designations.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Designation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapped.slice(0, 25).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm">{r.designation}</TableCell>
                      </TableRow>
                    ))}
                    {mapped.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                          Pick the column holding worker names to preview rows.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Badge variant="secondary">{mapped.length} worker(s) ready to import</Badge>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={mapped.length === 0 || isSaving}>
            {isSaving ? "Importing..." : `Import ${mapped.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
