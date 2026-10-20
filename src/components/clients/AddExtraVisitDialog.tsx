import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInWeeks, format } from "date-fns";
import { Plus, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AncVisit } from "@/types/anc";

const REASONS = [
  "Blood pressure review",
  "Urinalysis / protein review",
  "Anaemia review",
  "Fetal movement / growth concern",
  "Weekly monitoring from 36 weeks",
  "Post-date surveillance (beyond 40 weeks)",
  "Lab result review",
  "Other",
];

type Props = { clientId: string; lmp?: Date | string | null; visits: (AncVisit & { pregnancy_number?: number })[] };

export function AddExtraVisitDialog({ clientId, lmp, visits }: Props) {
  const qc = useQueryClient();
  const { accountId } = useAuth() as { accountId?: string | null };
  const { requireWorker, logAction } = useActiveWorker();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [date, setDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [weekly, setWeekly] = useState(false);
  const [count, setCount] = useState(4);

  const pregnancy = Math.max(1, ...visits.map((v) => v.pregnancy_number ?? 1));
  const accId = (visits[0] as { account_id?: string | null } | undefined)?.account_id ?? accountId ?? null;
  const gaAt = (d: Date) => (lmp ? Math.max(0, differenceInWeeks(d, new Date(lmp))) : 0);

  const add = useMutation({
    mutationFn: async () => {
      const why = reason === "Other" ? other.trim() : reason;
      if (!why) throw new Error("Please enter a reason");
      const start = new Date(date);
      const n = weekly ? Math.min(Math.max(count, 1), 8) : 1;
      const maxNum = Math.max(0, ...visits.map((v) => v.visit_number));
      const rows = Array.from({ length: n }, (_, i) => {
        const d = addDays(start, i * 7);
        return {
          client_id: clientId,
          account_id: accId,
          pregnancy_number: pregnancy,
          visit_number: maxNum + i + 1,
          visit_name: weekly ? `Weekly review ${i + 1}` : "Extra review visit",
          gestational_weeks: gaAt(d),
          scheduled_date: format(d, "yyyy-MM-dd"),
          status: "Pending",
          is_extra: true,
          visit_reason: why,
        };
      });
      const { error } = await supabase.from("anc_visits").insert(rows as never);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["anc-visits", clientId] });
      logAction("ANC_EXTRA_VISIT_ADDED", "anc_visits", clientId, { reason, count: n });
      toast.success(n > 1 ? `${n} weekly review visits added` : "Extra review visit added");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not add visit"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="min-h-11" onClick={async (e) => { e.preventDefault(); if (await requireWorker()) setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Extra visit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add extra / review visit</DialogTitle>
          <DialogDescription>For closer monitoring between the 8 routine contacts. Reminders and defaulter tracking apply.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => { setReason(v); if (v.startsWith("Weekly") || v.startsWith("Post-date")) setWeekly(true); }}>
              <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>{REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            {reason === "Other" && <Textarea placeholder="Describe what needs review" value={other} onChange={(e) => setOther(e.target.value)} />}
          </div>
          <div className="space-y-1">
            <Label>{weekly ? "First visit date" : "Visit date"}</Label>
            <Input type="date" className="min-h-11" value={date} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDate(e.target.value)} />
            {lmp && date && <p className="text-xs text-muted-foreground">About {gaAt(new Date(date))} weeks pregnant on this date.</p>}
          </div>
          <label className="flex items-center gap-2 text-sm min-h-11">
            <input type="checkbox" className="h-5 w-5" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
            <CalendarRange className="h-4 w-4" /> Repeat weekly
          </label>
          {weekly && (
            <div className="space-y-1">
              <Label>Number of weekly visits (1–8)</Label>
              <Input type="number" min={1} max={8} className="min-h-11" value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button className="min-h-11" disabled={add.isPending} onClick={() => add.mutate()}>Add visit{weekly && count > 1 ? "s" : ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
