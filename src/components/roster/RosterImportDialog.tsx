import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";

export interface RosterImportRow {
  name: string;
  designation: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designations: string[];
  /** Names already on the roster — used to flag duplicates before import. */
  existingNames?: string[];
  isSaving?: boolean;
  onImport: (rows: RosterImportRow[]) => void;
}

const NONE = "__none__";

const guess = (headers: string[], keys: string[]) =>
  headers.find((h) => keys.some((k) => h.toLowerCase().replace(/[^a-z]/g, "").includes(k))) ?? NONE;

interface PreparedRow {
  rowNumber: number;
  name: string;
  designation: string;
  error: string | null;
}

export function RosterImportDialog({
  open, onOpenChange, designations, existingNames = [], isSaving, onImport,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [nameCol, setNameCol] = useState<string>(NONE);
  const [desigCol, setDesigCol] = useState<string>(NONE);
  const [fallbackDesig, setFallbackDesig] = useState<string>(designations[0] ?? "Other");
  const [edits, setEdits] = useState<Record<number, Partial<RosterImportRow>>>({});
  const [onlyIssues, setOnlyIssues] = useState(false);

  const reset = () => {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setNameCol(NONE);
    setDesigCol(NONE);
    setEdits({});
    setOnlyIssues(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const sample = [
      { Name: "Adaeze Okafor", Designation: designations[0] ?? "Nurse" },
      { Name: "Musa Bello", Designation: designations[1] ?? designations[0] ?? "Nurse" },
    ];
    const ws = XLSX.utils.json_to_sheet(sample, { header: ["Name", "Designation"] });
    ws["!cols"] = [{ wch: 32 }, { wch: 28 }];
    const guide = XLSX.utils.aoa_to_sheet([
      ["Matmama roster upload template"],
      [],
      ["Column", "Required", "Format"],
      ["Name", "Yes", "Full name of the health worker, 2-100 characters"],
      ["Designation", "No", `One of: ${designations.join(", ")}`],
      [],
      ["Notes"],
      ["Keep the header row exactly as provided on the 'Roster' sheet."],
      ["One health worker per row. Duplicate names are skipped."],
      ["Leave Designation blank to use the default designation chosen at upload."],
    ]);
    guide["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Roster");
    XLSX.utils.book_append_sheet(wb, guide, "Instructions");
    XLSX.writeFile(wb, "matmama-roster-template.xlsx");
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
      setEdits({});
      setOnlyIssues(false);
      setNameCol(guess(cols, ["name", "fullname", "worker", "staff"]));
      setDesigCol(guess(cols, ["designation", "role", "cadre", "title", "position"]));
    } catch {
      toast.error("Could not read that file. Use a .xlsx, .xls or .csv sheet.");
    }
  };

  const existing = useMemo(
    () => new Set(existingNames.map((n) => n.trim().toLowerCase())),
    [existingNames],
  );

  const prepared: PreparedRow[] = useMemo(() => {
    const seen = new Map<string, number>();
    return rows.map((r, i) => {
      const rowNumber = i + 2; // header is row 1
      const rawName = String(nameCol !== NONE ? r[nameCol] ?? "" : "").trim();
      const rawDesig = String(desigCol !== NONE ? r[desigCol] ?? "" : "").trim();
      const name = (edits[i]?.name ?? rawName).trim();
      const designation = (edits[i]?.designation ?? rawDesig ?? "").trim() || fallbackDesig;

      let error: string | null = null;
      const key = name.toLowerCase();
      if (!name) error = "Name is empty";
      else if (name.length < 2) error = "Name is too short";
      else if (name.length > 100) error = "Name exceeds 100 characters";
      else if (!/^[\p{L}\p{M}'.\- ]+$/u.test(name)) error = "Name contains invalid characters";
      else if (existing.has(key)) error = "Already on the roster";
      else if (seen.has(key)) error = `Duplicate of row ${seen.get(key)}`;
      else if (!designations.includes(designation)) error = `Unknown designation "${designation}"`;

      if (!error) seen.set(key, rowNumber);
      return { rowNumber, name, designation, error };
    });
  }, [rows, nameCol, desigCol, edits, fallbackDesig, designations, existing]);

  const valid = prepared.filter((r) => !r.error);
  const invalid = prepared.filter((r) => r.error);
  const visible = onlyIssues ? invalid : prepared;

  const submit = () => {
    if (valid.length === 0) {
      toast.error("No valid rows to import — fix the flagged rows first.");
      return;
    }
    onImport(valid.map(({ name, designation }) => ({ name, designation })));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import roster from Excel</DialogTitle>
          <DialogDescription>
            Download the template for the correct columns, or upload your own .xlsx, .xls or .csv
            sheet and match its columns to the roster fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
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
            <Button variant="ghost" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download template
            </Button>
            {fileName && (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
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

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {valid.length} valid
                </Badge>
                <Badge variant={invalid.length ? "destructive" : "outline"} className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {invalid.length} with issues
                </Badge>
                <div className="ml-auto flex items-center gap-2">
                  <Switch
                    id="only-issues"
                    checked={onlyIssues}
                    onCheckedChange={setOnlyIssues}
                    disabled={invalid.length === 0}
                  />
                  <Label htmlFor="only-issues" className="text-sm">Show only rows with issues</Label>
                </div>
              </div>

              <div className="rounded-md border max-h-72 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-48">Designation</TableHead>
                      <TableHead className="w-56">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((r) => {
                      const idx = r.rowNumber - 2;
                      return (
                        <TableRow key={r.rowNumber} className={r.error ? "bg-destructive/5" : undefined}>
                          <TableCell className="text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                          <TableCell>
                            <Input
                              value={r.name}
                              onChange={(e) =>
                                setEdits((p) => ({ ...p, [idx]: { ...p[idx], name: e.target.value } }))
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={designations.includes(r.designation) ? r.designation : ""}
                              onValueChange={(v) =>
                                setEdits((p) => ({ ...p, [idx]: { ...p[idx], designation: v } }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder={r.designation || "Select"} />
                              </SelectTrigger>
                              <SelectContent>
                                {designations.map((d) => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.error ? (
                              <span className="inline-flex items-center gap-1 text-destructive">
                                <AlertTriangle className="h-3 w-3" /> {r.error}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3" /> Ready
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {visible.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          {rows.length === 0
                            ? "Pick the column holding worker names to preview rows."
                            : "No rows to show."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {invalid.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Correct a flagged row inline, or import anyway — flagged rows are skipped.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={valid.length === 0 || isSaving}>
            {isSaving
              ? "Importing..."
              : invalid.length > 0
                ? `Import ${valid.length} valid, skip ${invalid.length}`
                : `Import ${valid.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
