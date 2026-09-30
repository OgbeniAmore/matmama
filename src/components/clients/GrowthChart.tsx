import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, format } from "date-fns";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  clientId: string;
  accountId?: string;
  childDob?: Date;
}

interface Row {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  height_cm: number | null;
}

const ageMonths = (dob: Date | undefined, d: string) =>
  dob ? Math.max(0, Math.round((differenceInDays(new Date(d), dob) / 30.44) * 10) / 10) : null;

export function GrowthChart({ clientId, accountId, childDob }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const key = ["growth", clientId];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("growth_measurements")
        .select("id, measured_on, weight_kg, height_cm")
        .eq("client_id", clientId)
        .order("measured_on");
      if (error) throw error;
      return data as Row[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const w = weight ? Number(weight) : null;
      const h = height ? Number(height) : null;
      if (w === null && h === null) throw new Error("Enter weight or height");
      if ((w !== null && (w <= 0 || w > 50)) || (h !== null && (h <= 20 || h > 150)))
        throw new Error("Values look out of range for a child");
      const uid = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await (supabase as any).from("growth_measurements").insert({
        client_id: clientId, account_id: accountId ?? null, measured_on: date,
        weight_kg: w, height_cm: h, recorded_by: uid,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setWeight(""); setHeight("");
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Measurement saved" });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("growth_measurements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const chartData = rows.map((r) => ({
    label: childDob ? `${ageMonths(childDob, r.measured_on)} mo` : format(new Date(r.measured_on), "d MMM yy"),
    weight: r.weight_kg != null ? Number(r.weight_kg) : null,
    height: r.height_cm != null ? Number(r.height_cm) : null,
  }));

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Growth Chart</h3>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No measurements yet. Add the first one below.</p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="w" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="h" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="w" type="monotone" dataKey="weight" name="Weight (kg)" stroke="hsl(var(--primary))" connectNulls dot />
              <Line yAxisId="h" type="monotone" dataKey="height" name="Height (cm)" stroke="hsl(var(--muted-foreground))" connectNulls dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {rows.length > 0 && (
        <div className="text-sm divide-y rounded-md border">
          {[...rows].reverse().map((r) => (
            <div key={r.id} className="flex items-center justify-between px-3 py-2">
              <span>
                {format(new Date(r.measured_on), "PP")}
                {childDob && <span className="text-muted-foreground"> · {ageMonths(childDob, r.measured_on)} months</span>}
              </span>
              <span className="flex items-center gap-3">
                {r.weight_kg != null && <span>{Number(r.weight_kg)} kg</span>}
                {r.height_cm != null && <span>{Number(r.height_cm)} cm</span>}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove.mutate(r.id)} aria-label="Delete measurement">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Weight (kg)</Label>
          <Input type="number" step="0.01" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height (cm)</Label>
          <Input type="number" step="0.1" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
      </div>
      <Button size="sm" onClick={() => add.mutate()} disabled={add.isPending || (!weight && !height)}>
        {add.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Add measurement
      </Button>
    </div>
  );
}
