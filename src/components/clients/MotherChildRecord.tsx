import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Baby, CheckCircle2, Plus, HeartPulse, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Client, EpiSchedule } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import { useAuth } from "@/contexts/AuthContext";
import { generateClientId } from "@/lib/ids";
import { generateImmunizationSchedule } from "@/utils/immunizationUtils";
import { generateAncSchedule, calculateEddFromLmp } from "@/utils/ancUtils";

interface Delivery {
  id: string;
  pregnancy_number: number;
  delivery_date: string;
  place: string | null;
  delivery_mode: string | null;
  outcome: string;
  number_of_babies: number;
  notes: string | null;
}

interface ChildRow {
  id: string;
  name: string;
  child_name: string | null;
  child_dob: string | null;
  status: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export function MotherChildRecord({ client }: { client: Client }) {
  const qc = useQueryClient();
  const { requireWorker, logAction } = useActiveWorker();
  const { accountId, facilityId } = useAuth();

  const { data: currentPregnancy = 1 } = useQuery({
    queryKey: ["anc-pregnancy", client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("anc_visits").select("pregnancy_number" as any)
        .eq("client_id", client.id).order("pregnancy_number" as any, { ascending: false }).limit(1);
      return ((data?.[0] as any)?.pregnancy_number as number) ?? 1;
    },
  });

  const { data: deliveries = [] } = useQuery<Delivery[]>({
    queryKey: ["deliveries", client.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("deliveries")
        .select("*").eq("mother_client_id", client.id).order("pregnancy_number", { ascending: false });
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const { data: children = [] } = useQuery<ChildRow[]>({
    queryKey: ["children", client.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("clients")
        .select("id, name, child_name, child_dob, status")
        .eq("mother_client_id", client.id).order("child_dob", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChildRow[];
    },
  });

  const delivered = deliveries.some((d) => d.pregnancy_number === currentPregnancy);

  const invalidate = () => {
    ["deliveries", "children", "anc-pregnancy", "anc-visits"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k, client.id] }),
    );
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["defaulters"] });
  };

  // ---- Record delivery ----
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [dForm, setDForm] = useState({
    confirmed: false, date: today(), place: "This facility", mode: "Normal (vaginal)",
    outcome: "Live birth", babies: "1", notes: "",
  });

  const recordDelivery = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from as any)("deliveries").insert({
        mother_client_id: client.id,
        pregnancy_number: currentPregnancy,
        delivery_date: dForm.date,
        place: dForm.place,
        delivery_mode: dForm.mode,
        outcome: dForm.outcome,
        number_of_babies: Number(dForm.babies) || 1,
        notes: dForm.notes || null,
        recorded_by: u.user?.id ?? null,
        account_id: client.account_id ?? accountId,
        facility_id: client.facility_id ?? facilityId,
      }).select("id").single();
      if (error) throw error;
      await supabase.rpc("resync_client_status", { _client_id: client.id });
      return data.id as string;
    },
    onSuccess: (id) => {
      logAction("DELIVERY_RECORDED", "deliveries", id, {
        client_name: client.name, pregnancy: currentPregnancy, outcome: dForm.outcome,
      });
      toast.success("Delivery recorded");
      setDeliveryOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- Register baby ----
  const [babyFor, setBabyFor] = useState<Delivery | null>(null);
  const [babyName, setBabyName] = useState("");
  const [babyDob, setBabyDob] = useState(today());

  const registerBaby = useMutation({
    mutationFn: async () => {
      const id = generateClientId();
      const dob = new Date(`${babyDob}T00:00:00`);
      const { data: epi } = await supabase.from("epi_schedule").select("*").order("age_weeks");
      const { error } = await supabase.from("clients").insert({
        id,
        name: client.name,
        child_name: babyName.trim(),
        child_dob: babyDob,
        service: "Routine Immunization",
        status: "On Track",
        due_date: dob.toISOString(),
        contact: client.contact,
        address: client.address,
        assigned_to: client.assignedTo,
        preferred_channel: client.preferred_channel ?? "sms",
        account_id: client.account_id ?? accountId,
        facility_id: client.facility_id ?? facilityId,
        mother_client_id: client.id,
      } as any);
      if (error) throw error;
      const schedule = generateImmunizationSchedule(dob, (epi ?? []) as EpiSchedule[], id)
        .map((s) => ({ ...s, account_id: client.account_id ?? accountId }));
      if (schedule.length) {
        const { error: e2 } = await supabase.from("immunization_records").insert(schedule);
        if (e2) console.error(e2);
      }
      await supabase.rpc("resync_client_status", { _client_id: id });
      return id;
    },
    onSuccess: (id) => {
      logAction("CHILD_REGISTERED", "clients", id, { child_name: babyName, mother: client.name });
      toast.success("Baby registered with immunization schedule");
      setBabyFor(null);
      setBabyName("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---- New pregnancy ----
  const [pregOpen, setPregOpen] = useState(false);
  const [lmp, setLmp] = useState("");

  const startPregnancy = useMutation({
    mutationFn: async () => {
      const lmpDate = new Date(`${lmp}T00:00:00`);
      const edd = calculateEddFromLmp(lmpDate);
      const next = currentPregnancy + 1;
      const visits = generateAncSchedule(edd, client.id).map((v) => ({
        ...v, account_id: client.account_id ?? accountId, pregnancy_number: next,
      }));
      const { error } = await supabase.from("anc_visits").insert(visits as any);
      if (error) throw error;
      const { error: e2 } = await supabase.from("clients").update({
        lmp, edd: edd.toISOString().slice(0, 10), status: "On Track",
      }).eq("id", client.id);
      if (e2) throw e2;
      await supabase.rpc("resync_client_status", { _client_id: client.id });
      return next;
    },
    onSuccess: (n) => {
      logAction("NEW_PREGNANCY", "clients", client.id, { client_name: client.name, pregnancy: n });
      toast.success(`Pregnancy ${n} started with a new ANC schedule`);
      setPregOpen(false);
      setLmp("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const babiesFor = (d: Delivery) =>
    children.filter((c) => c.child_dob && Math.abs(new Date(c.child_dob).getTime() - new Date(d.delivery_date).getTime()) < 3 * 86400000);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Baby className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Delivery & Children</h3>
        </div>
        <Badge variant="outline">Pregnancy {currentPregnancy}</Badge>
      </div>

      {!delivered ? (
        <Button variant="outline" className="w-full h-11" onClick={async () => { if (await requireWorker()) setDeliveryOpen(true); }}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Record delivery for pregnancy {currentPregnancy}
        </Button>
      ) : (
        <Button variant="outline" className="w-full h-11" onClick={async () => { if (await requireWorker()) setPregOpen(true); }}>
          <HeartPulse className="h-4 w-4 mr-2" /> Start new pregnancy
        </Button>
      )}

      {deliveries.length === 0 && (
        <p className="text-sm text-muted-foreground">No delivery recorded yet.</p>
      )}

      {deliveries.map((d) => {
        const babies = babiesFor(d);
        return (
          <div key={d.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Delivered — Pregnancy {d.pregnancy_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(d.delivery_date), "PP")} · {d.outcome} · {d.delivery_mode ?? "—"} · {d.place ?? "—"}
                  </p>
                  {d.notes && <p className="text-xs mt-1">{d.notes}</p>}
                </div>
              </div>
            </div>
            {babies.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-2 py-1.5">
                <span className="flex items-center gap-2"><Baby className="h-4 w-4" />{b.child_name}</span>
                <Badge variant="outline" className="text-xs">{b.status}</Badge>
              </div>
            ))}
            {d.outcome === "Live birth" && babies.length < d.number_of_babies && (
              <Button size="sm" variant="secondary" className="w-full"
                onClick={async () => { if (await requireWorker()) { setBabyDob(d.delivery_date); setBabyFor(d); } }}>
                <Plus className="h-4 w-4 mr-1" /> Register baby ({babies.length}/{d.number_of_babies})
              </Button>
            )}
          </div>
        );
      })}

      {/* Record delivery dialog */}
      <Dialog open={deliveryOpen} onOpenChange={setDeliveryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record delivery</DialogTitle>
            <DialogDescription>{client.name} — pregnancy {currentPregnancy}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={dForm.confirmed} onCheckedChange={(v) => setDForm({ ...dForm, confirmed: !!v })} />
              Mother has delivered
            </label>
            <div className="space-y-1">
              <Label>Delivery date</Label>
              <Input type="date" max={today()} value={dForm.date} onChange={(e) => setDForm({ ...dForm, date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Place</Label>
                <Select value={dForm.place} onValueChange={(v) => setDForm({ ...dForm, place: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["This facility", "Other facility", "Home", "Traditional birth attendant", "Other"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={dForm.mode} onValueChange={(v) => setDForm({ ...dForm, mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Normal (vaginal)", "Assisted", "Caesarean section"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Outcome</Label>
                <Select value={dForm.outcome} onValueChange={(v) => setDForm({ ...dForm, outcome: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Live birth", "Stillbirth", "Miscarriage"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Number of babies</Label>
                <Select value={dForm.babies} onValueChange={(v) => setDForm({ ...dForm, babies: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Textarea placeholder="Notes (optional)" value={dForm.notes} onChange={(e) => setDForm({ ...dForm, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryOpen(false)}>Cancel</Button>
            <Button disabled={!dForm.confirmed || !dForm.date || recordDelivery.isPending} onClick={() => recordDelivery.mutate()}>
              {recordDelivery.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register baby dialog */}
      <Dialog open={!!babyFor} onOpenChange={(o) => !o && setBabyFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register baby</DialogTitle>
            <DialogDescription>
              The baby is added under {client.name}'s record with an immunization schedule. Contact and address are copied from the mother.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Baby's name</Label>
              <Input value={babyName} onChange={(e) => setBabyName(e.target.value)} placeholder="e.g. Baby Adeola" />
            </div>
            <div className="space-y-1">
              <Label>Date of birth</Label>
              <Input type="date" max={today()} value={babyDob} onChange={(e) => setBabyDob(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBabyFor(null)}>Cancel</Button>
            <Button disabled={!babyName.trim() || !babyDob || registerBaby.isPending} onClick={() => registerBaby.mutate()}>
              {registerBaby.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New pregnancy dialog */}
      <Dialog open={pregOpen} onOpenChange={setPregOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start pregnancy {currentPregnancy + 1}</DialogTitle>
            <DialogDescription>A new ANC schedule is created. Earlier pregnancies and births stay in her record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>First day of last period</Label>
            <Input type="date" max={today()} value={lmp} onChange={(e) => setLmp(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPregOpen(false)}>Cancel</Button>
            <Button disabled={!lmp || startPregnancy.isPending} onClick={() => startPregnancy.mutate()}>
              {startPregnancy.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MotherLink({ motherId }: { motherId: string }) {
  const { data } = useQuery({
    queryKey: ["mother", motherId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("id", motherId).maybeSingle();
      return data;
    },
  });
  if (!data) return null;
  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">Mother</h3>
      <a href={`/clients?view=${data.id}`} className="text-primary underline-offset-2 hover:underline">{data.name}</a>
    </div>
  );
}
