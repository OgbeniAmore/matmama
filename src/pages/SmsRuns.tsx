import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, MessageSquare, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

type Reminder = {
  id: string;
  patient_id: string;
  reminder_category: string;
  reminder_type: string;
  message: string;
  status: string;
  delivery_status: string;
  sent_at: string;
  retry_count: number;
  error_detail: string | null;
  account_id: string | null;
};

type ClientLite = { id: string; name: string; facility_id: string | null };
type FacilityLite = { id: string; name: string };

const WINDOWS = ["automated_upcoming", "automated_day_of", "automated_follow_up", "automated_defaulter"] as const;
const WINDOW_LABEL: Record<string, string> = {
  automated_upcoming: "Upcoming (T-3)",
  automated_day_of: "Day of",
  automated_follow_up: "Follow-up (T+1)",
  automated_defaulter: "Defaulter (T+3)",
  manual: "Manual",
};

export default function SmsRuns() {
  const { role } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [clients, setClients] = useState<Record<string, ClientLite>>({});
  const [facilities, setFacilities] = useState<Record<string, FacilityLite>>({});
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const allowed = role === "system_admin" || role === "program_manager" || role === "facility_officer";

  const load = async () => {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [{ data: rems }, { data: cls }, { data: facs }] = await Promise.all([
      supabase
        .from("patient_reminders")
        .select("id, patient_id, reminder_category, reminder_type, message, status, delivery_status, sent_at, retry_count, error_detail, account_id")
        .gte("sent_at", since.toISOString())
        .order("sent_at", { ascending: false })
        .limit(1000),
      supabase.from("clients").select("id, name, facility_id"),
      supabase.from("facilities").select("id, name"),
    ]);

    setReminders((rems as Reminder[]) || []);
    const cmap: Record<string, ClientLite> = {};
    (cls || []).forEach((c: any) => { cmap[c.id] = c; });
    setClients(cmap);
    const fmap: Record<string, FacilityLite> = {};
    (facs || []).forEach((f: any) => { fmap[f.id] = f; });
    setFacilities(fmap);
    setLoading(false);
  };

  useEffect(() => { if (allowed) load(); }, [allowed, days]);

  const stats = useMemo(() => {
    const byWindow: Record<string, { sent: number; failed: number; queued: number }> = {};
    [...WINDOWS, "manual"].forEach(w => byWindow[w] = { sent: 0, failed: 0, queued: 0 });

    const byFacilityDate: Record<string, Record<string, { sent: number; failed: number }>> = {};

    for (const r of reminders) {
      const w = byWindow[r.reminder_category] ? r.reminder_category : "manual";
      if (r.delivery_status === "failed") byWindow[w].failed++;
      else if (r.delivery_status === "queued") byWindow[w].queued++;
      else byWindow[w].sent++;

      const c = clients[r.patient_id];
      const fid = c?.facility_id || "unknown";
      const fname = facilities[fid]?.name || "Unknown facility";
      const date = format(new Date(r.sent_at), "yyyy-MM-dd");
      byFacilityDate[fname] ??= {};
      byFacilityDate[fname][date] ??= { sent: 0, failed: 0 };
      if (r.delivery_status === "failed") byFacilityDate[fname][date].failed++;
      else byFacilityDate[fname][date].sent++;
    }
    return { byWindow, byFacilityDate };
  }, [reminders, clients, facilities]);

  const totals = useMemo(() => {
    const sent = reminders.filter(r => r.delivery_status !== "failed").length;
    const failed = reminders.filter(r => r.delivery_status === "failed").length;
    const queued = reminders.filter(r => r.delivery_status === "queued").length;
    return { sent, failed, queued, total: reminders.length };
  }, [reminders]);

  if (!allowed) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          You do not have permission to view SMS reminder runs.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> SMS Reminder Runs
          </h1>
          <p className="text-sm text-muted-foreground">Per-window send counts, deliveries and failures.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} max={90} value={days} onChange={e => setDays(Math.max(1, Math.min(90, +e.target.value || 7)))} className="w-24" />
          <span className="text-sm text-muted-foreground">days</span>
          <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Top totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<MessageSquare className="h-5 w-5" />} label="Total" value={totals.total} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Delivered/queued" value={totals.sent} />
        <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="Queued" value={totals.queued} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} label="Failed" value={totals.failed} />
      </div>

      {/* Per-window */}
      <Card>
        <CardHeader><CardTitle>By window</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...WINDOWS, "manual"].map(w => (
            <div key={w} className="border rounded-lg p-3">
              <div className="text-sm font-medium">{WINDOW_LABEL[w]}</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <Badge variant="secondary">Sent {stats.byWindow[w].sent}</Badge>
                <Badge variant="outline">Queued {stats.byWindow[w].queued}</Badge>
                <Badge variant="destructive">Failed {stats.byWindow[w].failed}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Per facility / date */}
      <Card>
        <CardHeader><CardTitle>By facility & date</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : Object.keys(stats.byFacilityDate).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders in this window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Facility</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Sent</th>
                    <th className="py-2 pr-4">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.byFacilityDate).flatMap(([fname, dates]) =>
                    Object.entries(dates).sort(([a], [b]) => b.localeCompare(a)).map(([date, v]) => (
                      <tr key={fname + date} className="border-b last:border-0">
                        <td className="py-2 pr-4">{fname}</td>
                        <td className="py-2 pr-4">{date}</td>
                        <td className="py-2 pr-4">{v.sent}</td>
                        <td className="py-2 pr-4">{v.failed > 0 ? <span className="text-red-600 font-medium">{v.failed}</span> : 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent failures */}
      <Card>
        <CardHeader><CardTitle>Recent failures</CardTitle></CardHeader>
        <CardContent>
          {reminders.filter(r => r.delivery_status === "failed").slice(0, 20).length === 0 ? (
            <p className="text-sm text-muted-foreground">No failures. </p>
          ) : (
            <ul className="space-y-2">
              {reminders.filter(r => r.delivery_status === "failed").slice(0, 20).map(r => (
                <li key={r.id} className="border rounded p-2 text-sm">
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="font-medium">{clients[r.patient_id]?.name || r.patient_id}</span>
                    <span className="text-muted-foreground">{format(new Date(r.sent_at), "PPp")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {WINDOW_LABEL[r.reminder_category] || r.reminder_category} · attempts {r.retry_count}
                  </div>
                  {r.error_detail && <div className="text-xs text-red-600 mt-1">{r.error_detail}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-md bg-muted">{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
