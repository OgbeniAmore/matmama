import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInWeeks, format } from "date-fns";
import { Shield, Pill, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iptpEligibility, nextTtEligibleDate } from "@/utils/ancUtils";

type Treatment = {
  id: string;
  treatment_type: "TT" | "IPTp" | "IFA" | "Calcium" | "Albendazole";
  dose_number: number | null;
  given_on: string;
  is_prior: boolean;
  pregnancy_number: number;
  actor_name: string | null;
};

const SUPPLEMENTS: { key: Treatment["treatment_type"]; label: string; hint: string }[] = [
  { key: "IFA", label: "Iron + Folic Acid", hint: "Daily — dispense each visit" },
  { key: "Calcium", label: "Calcium", hint: "Daily from 20 weeks (pre-eclampsia prevention)" },
  { key: "Albendazole", label: "Albendazole (deworming)", hint: "Single dose, 2nd or 3rd trimester" },
];

export function MaternalTreatmentsCard({ clientId, lmp }: { clientId: string; lmp?: Date | string | null }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const canAct = role === "facility_officer";
  const { requireWorker, logAction } = useActiveWorker();
  const [priorTt, setPriorTt] = useState("");
  const [priorDate, setPriorDate] = useState("");

  const { data: pregnancy = 1 } = useQuery({
    queryKey: ["anc-current-pregnancy", clientId],
    queryFn: async () => {
      const { data } = await supabase.from("anc_visits").select("pregnancy_number").eq("client_id", clientId)
        .order("pregnancy_number", { ascending: false }).limit(1);
      return (data?.[0]?.pregnancy_number as number) ?? 1;
    },
  });

  const { data: rows = [] } = useQuery<Treatment[]>({
    queryKey: ["maternal-treatments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("maternal_treatments" as never).select("*")
        .eq("client_id", clientId).order("given_on", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Treatment[];
    },
  });

  const add = useMutation({
    mutationFn: async (r: { treatment_type: Treatment["treatment_type"]; dose_number?: number | null; given_on?: string; is_prior?: boolean }) => {
      const worker = await requireWorker();
      if (!worker) throw new Error("cancelled");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("maternal_treatments" as never).insert({
        client_id: clientId, pregnancy_number: pregnancy, recorded_by: u.user?.id,
        actor_name: (worker as { name?: string }).name ?? null,
        given_on: r.given_on ?? format(new Date(), "yyyy-MM-dd"),
        dose_number: r.dose_number ?? null, treatment_type: r.treatment_type, is_prior: !!r.is_prior,
      } as never);
      if (error) throw error;
      return r;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["maternal-treatments", clientId] });
      logAction("MATERNAL_TREATMENT_GIVEN", "maternal_treatments", clientId, r as Record<string, unknown>);
      toast.success("Recorded");
    },
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error(e.message || "Could not save"); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!(await requireWorker())) throw new Error("cancelled");
      const { error } = await supabase.from("maternal_treatments" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maternal-treatments", clientId] }),
    onError: (e: Error) => { if (e.message !== "cancelled") toast.error("Could not remove"); },
  });

  const tt = rows.filter((r) => r.treatment_type === "TT").sort((a, b) => (a.dose_number ?? 0) - (b.dose_number ?? 0));
  const ttCount = tt.length ? Math.max(...tt.map((t) => t.dose_number ?? 0)) : 0;
  const ttNext = nextTtEligibleDate(tt.map((t) => ({ dose_number: t.dose_number ?? 0, given_on: t.given_on })));
  const ttProtection = ttCount >= 5 ? "Lifetime protection" : ttCount >= 2 ? "Protected this pregnancy" : "Not yet protected";

  const iptp = rows.filter((r) => r.treatment_type === "IPTp" && r.pregnancy_number === pregnancy);
  const ga = lmp ? Math.max(0, differenceInWeeks(new Date(), new Date(lmp))) : 0;
  const iptpElig = iptpEligibility(ga, iptp);

  const row = (t: Treatment, label: string) => (
    <li key={t.id} className="flex items-center justify-between gap-2 text-sm py-1">
      <span className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="break-words">{label} — {format(new Date(t.given_on), "PP")}{t.is_prior ? " (previous record)" : ""}{t.actor_name ? ` · ${t.actor_name}` : ""}</span>
      </span>
      {canAct && (
        <Button size="icon" variant="ghost" className="h-9 w-9" aria-label="Remove" onClick={() => remove.mutate(t.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </li>
  );

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Maternal Vaccines & Medications</h3>
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Tetanus (TT / Td) — {ttCount} of 5 doses</p>
          <Badge variant="outline" className={ttCount >= 2 ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200"}>{ttProtection}</Badge>
        </div>
        <ul>{tt.map((t) => row(t, `TT${t.dose_number}`))}</ul>
        {canAct && ttCount < 5 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="min-h-11" disabled={add.isPending || (ttNext !== null && ttNext > new Date())}
              onClick={() => add.mutate({ treatment_type: "TT", dose_number: ttCount + 1 })}>
              Give TT{ttCount + 1} today
            </Button>
            {ttNext && ttNext > new Date() && <span className="text-xs text-muted-foreground">TT{ttCount + 1} due from {format(ttNext, "PP")}</span>}
          </div>
        )}
        {canAct && ttCount < 5 && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Dose received before (from card)</Label>
              <Input className="min-h-11 w-24" type="number" min={ttCount + 1} max={5} placeholder={`TT${ttCount + 1}`} value={priorTt} onChange={(e) => setPriorTt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date given</Label>
              <Input className="min-h-11" type="date" max={format(new Date(), "yyyy-MM-dd")} value={priorDate} onChange={(e) => setPriorDate(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" className="min-h-11" disabled={!priorTt || !priorDate || add.isPending}
              onClick={() => { add.mutate({ treatment_type: "TT", dose_number: Number(priorTt), given_on: priorDate, is_prior: true }); setPriorTt(""); setPriorDate(""); }}>
              Add previous dose
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-2 border-t pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Malaria prevention (IPTp-SP / Fansidar) — {iptp.length} dose{iptp.length === 1 ? "" : "s"} this pregnancy</p>
          <Badge variant="outline" className={iptp.length >= 3 ? "bg-green-100 text-green-800 border-green-200" : "bg-amber-100 text-amber-800 border-amber-200"}>
            {iptp.length >= 3 ? "Minimum 3 doses met" : "Below 3 doses"}
          </Badge>
        </div>
        <ul>{iptp.map((t) => row(t, `SP${t.dose_number}`))}</ul>
        {canAct && iptp.length < 5 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="min-h-11" disabled={add.isPending || !iptpElig.eligible}
              onClick={() => add.mutate({ treatment_type: "IPTp", dose_number: iptp.length + 1 })}>
              Give SP{iptp.length + 1} today (observed)
            </Button>
            {!iptpElig.eligible && <span className="text-xs text-muted-foreground">{iptpElig.reason}{iptpElig.nextDate ? ` — from ${format(iptpElig.nextDate, "PP")}` : ""}</span>}
          </div>
        )}
      </section>

      <section className="space-y-2 border-t pt-3">
        <p className="text-sm font-medium flex items-center gap-2"><Pill className="h-4 w-4" /> Routine supplements</p>
        {SUPPLEMENTS.map((s) => {
          const given = rows.filter((r) => r.treatment_type === s.key && r.pregnancy_number === pregnancy);
          const last = given[given.length - 1];
          return (
            <div key={s.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p>{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.hint}{last ? ` · last given ${format(new Date(last.given_on), "PP")} (${given.length}×)` : " · not yet given"}</p>
              </div>
              {canAct && !(s.key === "Albendazole" && given.length > 0) && (
                <Button size="sm" variant="outline" className="min-h-11" disabled={add.isPending}
                  onClick={() => add.mutate({ treatment_type: s.key })}>
                  Dispensed today
                </Button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
