import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LAGOS_LGAS } from "@/lib/lagos-lgas";

const chartConfig = {
  newClients: {
    label: "New Clients",
    color: "hsl(var(--primary))",
  },
  defaulterRate: {
    label: "Defaulter Rate (%)",
    color: "hsl(var(--destructive))",
  },
};

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function LgaTrendChart() {
  const [lgaFilter, setLgaFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-trend-30d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sinceIso = since.toISOString();

      const [clientsRes, facilitiesRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, status, facility_id, created_at, due_date")
          .gte("created_at", sinceIso),
        supabase.from("facilities").select("id, lga"),
      ]);

      const facilityLga = new Map<string, string | null>();
      for (const f of facilitiesRes.data ?? []) facilityLga.set(f.id, f.lga);

      // Also fetch all clients (not just last 30d) to compute defaulter rate per day
      const { data: allClients } = await supabase
        .from("clients")
        .select("id, status, facility_id, created_at, due_date");

      return {
        recent: clientsRes.data ?? [],
        all: allClients ?? [],
        facilityLga,
      };
    },
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    const days: { date: string; label: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        date: formatDateKey(d),
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }

    const matchesLga = (facilityId: string | null) => {
      if (lgaFilter === "all") return true;
      if (!facilityId) return false;
      return data.facilityLga.get(facilityId) === lgaFilter;
    };

    // New clients per day (from recent)
    const newPerDay = new Map<string, number>();
    for (const c of data.recent) {
      if (!matchesLga(c.facility_id)) continue;
      const key = (c.created_at ?? "").slice(0, 10);
      newPerDay.set(key, (newPerDay.get(key) ?? 0) + 1);
    }

    // Defaulter rate per day: of clients existing on that day (created <= day),
    // share whose due_date < day.
    const scoped = data.all.filter((c) => matchesLga(c.facility_id));

    return days.map((d) => {
      const dayEnd = new Date(d.date + "T23:59:59.999Z").getTime();
      let total = 0;
      let defaulting = 0;
      for (const c of scoped) {
        const created = c.created_at ? new Date(c.created_at).getTime() : 0;
        if (created > dayEnd) continue;
        total += 1;
        const due = c.due_date ? new Date(c.due_date).getTime() : null;
        if (due !== null && due < dayEnd) defaulting += 1;
      }
      const rate = total > 0 ? Math.round((defaulting / total) * 1000) / 10 : 0;
      return {
        date: d.date,
        label: d.label,
        newClients: newPerDay.get(d.date) ?? 0,
        defaulterRate: rate,
      };
    });
  }, [data, lgaFilter]);

  const handleExportCsv = () => {
    const header = ["Date", "LGA", "New Clients", "Defaulter Rate (%)"];
    const lgaLabel = lgaFilter === "all" ? "All LGAs" : lgaFilter;
    const escape = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = chartData.map((r) =>
      [r.date, lgaLabel, String(r.newClients), String(r.defaulterRate)]
        .map(escape)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeLga = lgaLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `trends-30d-${safeLga}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          30-Day Trends
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={lgaFilter} onValueChange={setLgaFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="LGA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All LGAs</SelectItem>
              {LAGOS_LGAS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleExportCsv}
            disabled={isLoading || chartData.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="left"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={30}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={36}
                  unit="%"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="newClients"
                  name="New Clients"
                  stroke="var(--color-newClients)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="defaulterRate"
                  name="Defaulter Rate (%)"
                  stroke="var(--color-defaulterRate)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
