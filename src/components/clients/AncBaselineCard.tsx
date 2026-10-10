import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Client } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

const isAlert = (v?: string | null) => v === "Reactive" || v === "Positive";
const SEROLOGY = ["Non-Reactive", "Reactive", "Pending"];
const HBV = ["Negative", "Positive", "Pending"];

type Key = "blood_group" | "genotype" | "hiv_status" | "hepatitis_b_status" | "vdrl_status";
const FIELDS: { key: Key; label: string; options: string[] }[] = [
  { key: "blood_group", label: "Blood group", options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Pending"] },
  { key: "genotype", label: "Genotype", options: ["AA", "AS", "AC", "SS", "SC", "Pending"] },
  { key: "hiv_status", label: "HIV I & II", options: SEROLOGY },
  { key: "hepatitis_b_status", label: "Hepatitis B", options: HBV },
  { key: "vdrl_status", label: "VDRL", options: SEROLOGY },
];

export function AncBaselineCard({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const { requireWorker, logAction } = useActiveWorker();
  const [values, setValues] = useState<Record<string, string | null | undefined>>({
    blood_group: client.blood_group, genotype: client.genotype, hiv_status: client.hiv_status,
    hepatitis_b_status: client.hepatitis_b_status, vdrl_status: client.vdrl_status,
    gravida: client.gravida?.toString(), para: client.para?.toString(),
  });
  const [draft, setDraft] = useState(values);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const alertFor = (k: Key, v?: string | null) =>
    k === "blood_group" ? !!v?.endsWith("-") : k === "genotype" ? v === "SS" || v === "SC" : isAlert(v);

  const save = async () => {
    if (!(await requireWorker())) return;
    setSaving(true);
    const update: Record<string, unknown> = {};
    FIELDS.forEach(({ key }) => (update[key] = draft[key] || null));
    update.gravida = draft.gravida ? Number(draft.gravida) : null;
    update.para = draft.para ? Number(draft.para) : null;
    const { data, error } = await supabase.from("clients").update(update).eq("id", client.id).select("id");
    setSaving(false);
    if (error || !data?.length) {
      toast.error("Could not save lab results" + (error ? `: ${error.message}` : " — you may not have permission"));
      return;
    }
    setValues(draft);
    setEditing(false);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    logAction("UPDATE_ANC_BASELINE", "clients", client.id, update as Record<string, unknown>);
    toast.success("Lab results updated");
  };

  const pendingCount = FIELDS.filter(({ key }) => !values[key] || values[key] === "Pending").length;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-sm">Booking history & tests</h4>
        <div className="flex items-center gap-2">
          <Badge variant="outline">G{values.gravida ?? "?"} P{values.para ?? "?"}</Badge>
          {!editing && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setDraft(values); setEditing(true); }}>
              <Pencil className="h-3 w-3 mr-1" /> {pendingCount ? `Update (${pendingCount} pending)` : "Edit"}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">Gravida (times pregnant)
              <Input type="number" min={0} value={draft.gravida ?? ""} onChange={(e) => setDraft({ ...draft, gravida: e.target.value })} />
            </label>
            <label className="text-xs text-muted-foreground">Para (births from 28 weeks)
              <Input type="number" min={0} value={draft.para ?? ""} onChange={(e) => setDraft({ ...draft, para: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FIELDS.map(({ key, label, options }) => (
              <label key={key} className="text-xs text-muted-foreground">{label}
                <Select value={draft[key] || ""} onValueChange={(v) => setDraft({ ...draft, [key]: v })}>
                  <SelectTrigger><SelectValue placeholder="Not recorded" /></SelectTrigger>
                  <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save results"}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{label}</span>
              <Badge variant={alertFor(key, values[key]) ? "destructive" : values[key] && values[key] !== "Pending" ? "secondary" : "outline"}>
                {values[key] || "Not recorded"}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Requested at first contact. Results still pending can be entered here once available. Reactive/positive, Rh-negative or SS/SC need follow-up per protocol.</p>
    </div>
  );
}
