import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/clients/AncVitalsPanel";
import type { RiskFlag, RiskLevel } from "@/utils/ancTriage";

type Row = { client_id: string; measured_on: string; created_at: string; risk_level: RiskLevel; risk_flags: RiskFlag[]; gestational_weeks: number | null; clients: { name: string; contact: string; service: string } | null };

export function AncRiskAlerts() {
  const { data = [] } = useQuery({
    queryKey: ["dashboard-anc-risk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anc_vitals")
        .select("client_id, measured_on, created_at, risk_level, risk_flags, gestational_weeks, clients(name, contact, service)")
        .order("measured_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const latest = new Map<string, Row>();
      for (const r of (data ?? []) as unknown as Row[]) if (!latest.has(r.client_id)) latest.set(r.client_id, r);
      return [...latest.values()]
        .filter((r) => r.risk_level === "critical" || r.risk_level === "high")
        .sort((a, b) => (a.risk_level === b.risk_level ? 0 : a.risk_level === "critical" ? -1 : 1));
    },
  });

  if (data.length === 0) return null;
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2 md:text-base">
          <HeartPulse className="h-4 w-4" />
          {data.length} ANC client{data.length > 1 ? "s" : ""} at critical / high risk
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.slice(0, 8).map((r) => (
          <Link key={r.client_id} to={`/clients?client=${r.client_id}`} className="block rounded-md border bg-background p-3 hover:bg-muted/50">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">{r.clients?.name ?? r.client_id}</span>
              <RiskBadge level={r.risk_level} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {r.risk_flags.map((f) => f.label).join(" · ")}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.gestational_weeks ? `${r.gestational_weeks} wks · ` : ""}Checked {format(new Date(r.measured_on), "MMM d")}
              {r.clients?.contact ? ` · ${r.clients.contact}` : ""}
            </p>
          </Link>
        ))}
        {data.length > 8 && <p className="text-xs text-muted-foreground">+{data.length - 8} more</p>}
      </CardContent>
    </Card>
  );
}
