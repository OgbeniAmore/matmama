import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, AlertTriangle, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RISK_STYLES, RiskFlag, RiskLevel, UrineLevel, triageAncVitals } from "@/utils/ancTriage";

const URINE: UrineLevel[] = ["negative", "trace", "1+", "2+", "3+", "4+"];

export interface AncVitalsRow {
  id: string;
  measured_on: string;
  gestational_weeks: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  fundal_height_cm: number | null;
  fetal_heart_rate_bpm: number | null;
  urine_protein: string | null;
  urine_glucose: string | null;
  weight_kg: number | null;
  hemoglobin_g_dl: number | null;
  risk_level: RiskLevel;
  risk_flags: RiskFlag[];
  actor_name: string | null;
  notes: string | null;
}

export function useAncVitals(clientId: string) {
  return useQuery({
    queryKey: ["anc-vitals", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anc_vitals")
        .select("*")
        .eq("client_id", clientId)
        .order("measured_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AncVitalsRow[];
    },
  });
}

function gaFromLmp(lmp?: string | null) {
  if (!lmp) return "";
  const w = Math.floor((Date.now() - new Date(lmp).getTime()) / (7 * 86400000));
  return w > 0 && w < 45 ? String(w) : "";
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const s = RISK_STYLES[level];
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

export function AncRiskBanner({ clientId }: { clientId: string }) {
  const { data = [] } = useAncVitals(clientId);
  const latest = data[0];
  if (!latest || latest.risk_level === "normal") return null;
  const critical = latest.risk_level === "critical" || latest.risk_level === "high";
  return (
    <Alert variant={critical ? "destructive" : "default"} className={critical ? "" : "border-amber-300 bg-amber-50 dark:bg-amber-950/40"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2 flex-wrap">
        Maternal risk flagged <RiskBadge level={latest.risk_level} />
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-sm">
          {latest.risk_flags.map((f) => <li key={f.code}><span className="font-medium">{f.label}.</span> {f.action}</li>)}
        </ul>
        <p className="text-xs mt-2 opacity-80">Last checked {format(new Date(latest.measured_on), "PP")}</p>
      </AlertDescription>
    </Alert>
  );
}

const num = (s: string) => (s.trim() === "" ? null : Number(s));

export function AncVitalsPanel({ clientId, lmp }: { clientId: string; lmp?: string | null }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { requireWorker, activeWorker } = useActiveWorker() as ReturnType<typeof useActiveWorker> & { activeWorker?: { name?: string } };
  const { data = [], isLoading } = useAncVitals(clientId);
  const [open, setOpen] = useState(false);
  const empty = { ga: "", sys: "", dia: "", fh: "", fhr: "", wt: "", hb: "", up: "", ug: "", notes: "" };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const input = useMemo(() => ({
    gestational_weeks: num(f.ga), systolic_bp: num(f.sys), diastolic_bp: num(f.dia),
    fundal_height_cm: num(f.fh), fetal_heart_rate_bpm: num(f.fhr), weight_kg: num(f.wt),
    hemoglobin_g_dl: num(f.hb),
    urine_protein: (f.up || null) as UrineLevel | null, urine_glucose: (f.ug || null) as UrineLevel | null,
  }), [f]);
  const triage = useMemo(() => triageAncVitals(input), [input]);

  const save = useMutation({
    mutationFn: async () => {
      if ((input.systolic_bp == null) !== (input.diastolic_bp == null)) throw new Error("Enter both systolic and diastolic BP");
      const { error } = await supabase.from("anc_vitals").insert({
        client_id: clientId, ...input, risk_level: triage.level,
        risk_flags: triage.flags as never, notes: f.notes.trim() || null,
        recorded_by: user!.id, actor_name: activeWorker?.name ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anc-vitals", clientId] });
      qc.invalidateQueries({ queryKey: ["anc-risk"] });
      setOpen(false); setF(empty);
      if (triage.level === "critical") toast.error("Critical risk recorded — refer now");
      else toast.success("Vitals saved");
    },
    onError: (e: Error) => toast.error(e.message || "Could not save vitals"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Clinical Vitals & Risk</h3>
        </div>
        <Button size="sm" onClick={async () => { if (await requireWorker()) { setF({ ...empty, ga: gaFromLmp(lmp) }); setOpen(true); } }}>
          <Plus className="h-4 w-4 mr-1" /> Record vitals
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {data.map((v) => (
            <div key={v.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium">{format(new Date(v.measured_on), "PP")}{v.gestational_weeks ? ` · ${v.gestational_weeks} wks` : ""}</span>
                <RiskBadge level={v.risk_level} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs">
                {v.systolic_bp != null && <span>BP: <b>{v.systolic_bp}/{v.diastolic_bp}</b></span>}
                {v.fundal_height_cm != null && <span>Fundal: <b>{v.fundal_height_cm} cm</b></span>}
                {v.fetal_heart_rate_bpm != null && <span>FHR: <b>{v.fetal_heart_rate_bpm} bpm</b></span>}
                {v.weight_kg != null && <span>Weight: <b>{v.weight_kg} kg</b></span>}
                {v.hemoglobin_g_dl != null && <span>Hb: <b>{v.hemoglobin_g_dl} g/dL</b></span>}
                {v.urine_protein && <span>Protein: <b>{v.urine_protein}</b></span>}
                {v.urine_glucose && <span>Glucose: <b>{v.urine_glucose}</b></span>}
              </div>
              {v.risk_flags.length > 0 && (
                <ul className="text-xs list-disc pl-4 text-muted-foreground">
                  {v.risk_flags.map((fl) => <li key={fl.code}>{fl.label}</li>)}
                </ul>
              )}
              {v.actor_name && <p className="text-xs text-muted-foreground">By {v.actor_name}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record ANC vitals</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gestational age (wks)" value={f.ga} onChange={set("ga")} />
            <Field label="Weight (kg)" value={f.wt} onChange={set("wt")} />
            <Field label="Systolic BP (mmHg)" value={f.sys} onChange={set("sys")} />
            <Field label="Diastolic BP (mmHg)" value={f.dia} onChange={set("dia")} />
            <Field label="Fundal height (cm)" value={f.fh} onChange={set("fh")} />
            <Field label="Fetal heart rate (bpm)" value={f.fhr} onChange={set("fhr")} />
            <Field label="Haemoglobin (g/dL)" value={f.hb} onChange={set("hb")} />
            <div />
            <UrineSelect label="Urine protein" value={f.up} onChange={(v) => setF((p) => ({ ...p, up: v }))} />
            <UrineSelect label="Urine glucose" value={f.ug} onChange={(v) => setF((p) => ({ ...p, ug: v }))} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={f.notes} onChange={set("notes")} rows={2} />
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">Live triage <RiskBadge level={triage.level} /></div>
            {triage.flags.length === 0 ? <p className="text-xs text-muted-foreground">No danger signs from the values entered.</p> : (
              <ul className="text-xs space-y-1">
                {triage.flags.map((fl) => <li key={fl.code}><b>{fl.label}:</b> {fl.action}</li>)}
              </ul>
            )}
            <p className="text-[11px] text-muted-foreground">Decision support only — follow facility protocol and clinical judgement.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save vitals
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" inputMode="decimal" step="any" value={value} onChange={onChange} className="h-11" />
    </div>
  );
}

function UrineSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11"><SelectValue placeholder="Not tested" /></SelectTrigger>
        <SelectContent>{URINE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
