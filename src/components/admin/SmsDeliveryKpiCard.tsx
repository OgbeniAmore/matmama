import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCircle2, XCircle, Activity } from "lucide-react";

interface Row {
  delivery_status: string | null;
  status: string | null;
  error_detail: string | null;
  sent_at: string;
  reminder_type: string | null;
}

function normalizeReason(detail: string | null): string {
  if (!detail) return "Unknown error";
  const d = detail.toLowerCase();
  if (d.includes("dnd")) return "DND active on number";
  if (d.includes("invalid") && d.includes("number")) return "Invalid phone number";
  if (d.includes("insufficient") || d.includes("balance")) return "Insufficient balance";
  if (d.includes("expired")) return "Message expired";
  if (d.includes("rejected")) return "Rejected by carrier";
  if (d.includes("timeout") || d.includes("network") || d.includes("fetch")) return "Network / timeout";
  if (d.includes("unauthor") || d.includes("api key")) return "Auth / API key issue";
  return detail.slice(0, 60);
}

export function SmsDeliveryKpiCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["sms-delivery-kpis"],
    queryFn: async () => {
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("patient_reminders")
        .select("delivery_status, status, error_detail, sent_at, reminder_type")
        .eq("reminder_type", "sms")
        .gte("sent_at", since30d)
        .order("sent_at", { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Row[];
      const since24h = Date.now() - 24 * 60 * 60 * 1000;

      const delivered = rows.filter((r) => r.delivery_status === "delivered").length;
      const failed = rows.filter((r) =>
        ["failed", "undelivered"].includes(r.delivery_status || ""),
      );
      const inFlight = rows.filter((r) =>
        ["queued", "sent"].includes(r.delivery_status || "queued"),
      ).length;
      const resolved = delivered + failed.length;
      const deliveryRate = resolved > 0 ? Math.round((delivered / resolved) * 100) : 0;

      const last24 = rows.filter((r) => new Date(r.sent_at).getTime() >= since24h);
      const last24Delivered = last24.filter((r) => r.delivery_status === "delivered").length;
      const last24Failed = last24.filter((r) =>
        ["failed", "undelivered"].includes(r.delivery_status || ""),
      ).length;

      const reasonMap = new Map<string, number>();
      for (const f of failed) {
        const reason = normalizeReason(f.error_detail);
        reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
      }
      const reasons = Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        total: rows.length,
        delivered,
        failed: failed.length,
        inFlight,
        deliveryRate,
        last24Volume: last24.length,
        last24Delivered,
        last24Failed,
        reasons,
      };
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" />
          SMS Delivery (Termii) — last 30 days
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <p className="text-3xl font-bold leading-tight">{data?.deliveryRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground">Delivery rate</p>
                <Progress value={data?.deliveryRate ?? 0} className="mt-2 h-1.5" />
              </div>
              <div>
                <p className="text-3xl font-bold leading-tight flex items-center gap-1.5">
                  <Activity className="h-5 w-5 text-primary" />
                  {data?.last24Volume ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Sent in last 24h</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data?.last24Delivered ?? 0} delivered · {data?.last24Failed ?? 0} failed
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold leading-tight flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {data?.delivered ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Delivered (30d)</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {data?.inFlight ?? 0} in flight
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold leading-tight flex items-center gap-1.5">
                  <XCircle className="h-5 w-5 text-destructive" />
                  {data?.failed ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Failed / undelivered</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  of {data?.total ?? 0} total
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Failure reasons</p>
              {(data?.reasons.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No SMS failures recorded in the last 30 days.
                </p>
              ) : (
                <div className="space-y-2">
                  {data!.reasons.map((r) => {
                    const pct = data!.failed > 0 ? Math.round((r.count / data!.failed) * 100) : 0;
                    return (
                      <div key={r.reason} className="flex items-center gap-3">
                        <span className="text-sm flex-1 truncate">{r.reason}</span>
                        <Progress value={pct} className="h-1.5 w-24 shrink-0" />
                        <Badge variant="outline" className="shrink-0">
                          {r.count} · {pct}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
