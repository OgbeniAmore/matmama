import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, UserCheck, UserX, Link as LinkIcon, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { RosterImportDialog, type RosterImportRow } from "@/components/roster/RosterImportDialog";

const DESIGNATIONS = [
  "Officer-in-Charge",
  "Medical Officer",
  "Nurse / Midwife",
  "Community Health Officer (CHO)",
  "Community Health Extension Worker (CHEW)",
  "Junior CHEW",
  "Pharmacy Technician",
  "Laboratory Technician",
  "Records Officer",
  "Health Attendant",
  "Volunteer",
  "Other",
];

interface RosterRow {
  id: string;
  name: string;
  designation: string;
  active: boolean;
  user_id: string | null;
  created_at: string;
}

const Roster = () => {
  const { role, facilityId, accountId, user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState(DESIGNATIONS[0]);
  const [linkSelf, setLinkSelf] = useState(true);

  const canManage =
    role === "facility_officer" ||
    role === "program_manager" ||
    role === "system_admin";

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ["facility-roster", facilityId],
    queryFn: async (): Promise<RosterRow[]> => {
      let q = supabase
        .from("facility_roster")
        .select("id, name, designation, active, user_id, created_at")
        .order("active", { ascending: false })
        .order("name");
      if (facilityId) q = q.eq("facility_id", facilityId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!facilityId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!facilityId || !accountId) throw new Error("Missing facility");
      const { error } = await supabase.from("facility_roster").insert({
        account_id: accountId,
        facility_id: facilityId,
        name: name.trim(),
        designation,
        user_id: linkSelf ? user?.id ?? null : null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Roster entry added");
      qc.invalidateQueries({ queryKey: ["facility-roster"] });
      setOpen(false);
      setName("");
      setDesignation(DESIGNATIONS[0]);
      setLinkSelf(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importMutation = useMutation({
    mutationFn: async (rows: RosterImportRow[]) => {
      if (!facilityId || !accountId) throw new Error("Missing facility");
      const existing = new Set(roster.map((r) => r.name.trim().toLowerCase()));
      const payload = rows
        .filter((r) => !existing.has(r.name.toLowerCase()))
        .map((r) => ({
          account_id: accountId,
          facility_id: facilityId,
          name: r.name,
          designation: r.designation,
          user_id: null,
          active: true,
        }));
      if (payload.length === 0) return 0;
      const { error } = await supabase.from("facility_roster").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(count ? `Imported ${count} health worker(s)` : "No new workers to import");
      qc.invalidateQueries({ queryKey: ["facility-roster"] });
      setImportOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const toggleActive = useMutation({
    mutationFn: async (row: RosterRow) => {
      const { error } = await supabase
        .from("facility_roster")
        .update({ active: !row.active })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facility-roster"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const linkToMe = useMutation({
    mutationFn: async (row: RosterRow) => {
      const { error } = await supabase
        .from("facility_roster")
        .update({ user_id: user?.id ?? null })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Linked to your account — audit logs will now show this designation");
      qc.invalidateQueries({ queryKey: ["facility-roster"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_roster").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["facility-roster"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!canManage) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Facility Roster</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Health workers at this facility. Linking a roster entry to a user account attributes
            their actions in the audit log.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="h-4 w-4" /> Upload Excel
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add health worker</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="roster-name">Full name</Label>
                <Input
                  id="roster-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Adaobi Okeke"
                />
              </div>
              <div className="space-y-1">
                <Label>Designation</Label>
                <Select value={designation} onValueChange={setDesignation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkSelf}
                  onChange={(e) => setLinkSelf(e.target.checked)}
                />
                Link this entry to my own account
              </label>
            </div>
            <DialogFooter>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!name.trim() || addMutation.isPending}
              >
                {addMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <RosterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        designations={DESIGNATIONS}
        existingNames={roster.map((r) => r.name)}
        isSaving={importMutation.isPending}
        onImport={(rows) => importMutation.mutate(rows)}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked user</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No roster entries yet. Add your first health worker above.
                  </TableCell>
                </TableRow>
              ) : (
                roster.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.designation}</TableCell>
                    <TableCell>
                      <Badge variant={r.active ? "default" : "outline"}>
                        {r.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.user_id ? (
                        r.user_id === user?.id ? (
                          <Badge variant="secondary">You</Badge>
                        ) : (
                          <span className="font-mono">{r.user_id.slice(0, 8)}…</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">Unlinked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {!r.user_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => linkToMe.mutate(r)}
                          title="Link to my account"
                        >
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive.mutate(r)}
                        title={r.active ? "Deactivate" : "Reactivate"}
                      >
                        {r.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(r.id)}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Roster;
