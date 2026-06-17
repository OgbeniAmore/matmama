import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lga: string;
  currentPmName: string | null;
}

interface Candidate {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  lga: string | null;
}

export function ReassignPmDialog({ open, onOpenChange, lga, currentPmName }: Props) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setSelected("");
  }, [open]);

  // Fetch all program_manager profiles (eligible candidates)
  const { data: candidates, isLoading } = useQuery({
    queryKey: ["pm-candidates"],
    queryFn: async () => {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "program_manager");
      if (rErr) throw rErr;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as Candidate[];
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, lga")
        .in("user_id", ids);
      if (pErr) throw pErr;
      return (profs ?? []) as Candidate[];
    },
    enabled: open,
  });

  const { current, others } = useMemo(() => {
    const list = candidates ?? [];
    return {
      current: list.filter((c) => c.lga === lga),
      others: list.filter((c) => c.lga !== lga),
    };
  }, [candidates, lga]);

  const handleSave = async () => {
    if (!selected) {
      toast.error("Pick a Program Manager");
      return;
    }
    setSaving(true);
    try {
      // Atomic, server-side validated reassignment + audit log
      const { error } = await supabase.rpc("reassign_program_manager", {
        _lga: lga,
        _new_pm_id: selected,
      });
      if (error) throw error;

      toast.success(`Program Manager assigned to ${lga}`);
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["pm-candidates"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to reassign Program Manager");
    } finally {
      setSaving(false);
    }
  };

  const fullName = (c: Candidate) =>
    [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed PM";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Reassign Program Manager
          </DialogTitle>
          <DialogDescription>
            {currentPmName
              ? `${currentPmName} currently manages ${lga}. Pick a different Program Manager to take over.`
              : `Assign a Program Manager to ${lga}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Program Manager</Label>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading candidates…</p>
          ) : others.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No other Program Managers available. Invite one from the Team section first.
            </p>
          ) : (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Program Manager" />
              </SelectTrigger>
              <SelectContent>
                {others.map((c) => (
                  <SelectItem key={c.user_id} value={c.user_id}>
                    {fullName(c)}
                    {c.lga ? ` — currently ${c.lga}` : " — unassigned"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selected && others.find((o) => o.user_id === selected)?.lga && (
            <p className="text-xs text-muted-foreground">
              Note: this PM's previous LGA seat will become vacant.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !selected}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
