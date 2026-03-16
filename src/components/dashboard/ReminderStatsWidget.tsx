import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { Bell, CheckCircle, XCircle, Clock, CalendarClock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReminderStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}

interface UpcomingClient {
  id: string;
  name: string;
  service: string;
  dueDate: Date;
  daysUntil: number;
}

const fetchReminderStats = async (): Promise<ReminderStats> => {
  const { data, error } = await supabase
    .from("patient_reminders")
    .select("status");

  if (error) throw error;

  const total = data?.length ?? 0;
  const sent = data?.filter((r) => r.status === "sent").length ?? 0;
  const failed = data?.filter((r) => r.status === "failed").length ?? 0;
  const pending = data?.filter((r) => r.status === "pending").length ?? 0;

  return {
    total,
    sent,
    failed,
    pending,
    successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
  };
};

const fetchUpcomingReminders = async (): Promise<UpcomingClient[]> => {
  const now = new Date();
  const threeDaysOut = addDays(now, 4);

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, service, due_date, status")
    .in("status", ["On Track", "Defaulting"])
    .gte("due_date", now.toISOString())
    .lte("due_date", threeDaysOut.toISOString())
    .order("due_date", { ascending: true })
    .limit(8);

  if (error) throw error;

  return (data ?? []).map((c) => {
    const dueDate = new Date(c.due_date);
    const diffMs = dueDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      id: c.id,
      name: c.name,
      service: c.service,
      dueDate,
      daysUntil,
    };
  });
};

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${color ?? "bg-muted"}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function ReminderStatsWidget() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["reminder-stats"],
    queryFn: fetchReminderStats,
  });

  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ["upcoming-reminders"],
    queryFn: fetchUpcomingReminders,
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Delivery Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 md:text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Reminder Delivery Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <StatItem
                  icon={<Bell className="h-4 w-4 text-primary" />}
                  label="Total Sent"
                  value={stats?.total ?? 0}
                  color="bg-primary/10"
                />
                <StatItem
                  icon={<CheckCircle className="h-4 w-4 text-[hsl(var(--status-ontrack))]" />}
                  label="Delivered"
                  value={stats?.sent ?? 0}
                  color="bg-[hsl(var(--status-ontrack))]/10"
                />
                <StatItem
                  icon={<XCircle className="h-4 w-4 text-destructive" />}
                  label="Failed"
                  value={stats?.failed ?? 0}
                  color="bg-destructive/10"
                />
                <StatItem
                  icon={<Clock className="h-4 w-4 text-[hsl(var(--status-pending))]" />}
                  label="Pending"
                  value={stats?.pending ?? 0}
                  color="bg-[hsl(var(--status-pending))]/10"
                />
              </div>
              {/* Success rate bar */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-semibold">{stats?.successRate ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--status-ontrack))] transition-all duration-500"
                    style={{ width: `${stats?.successRate ?? 0}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Automated Reminders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 md:text-lg">
            <CalendarClock className="h-5 w-5 text-secondary" />
            Upcoming Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming reminders in the next 3 days</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients?view=${client.id}`)}
                  className="flex items-center justify-between gap-2 text-sm w-full rounded-md px-2 py-1.5 -mx-2 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {client.daysUntil <= 0
                        ? "Today"
                        : client.daysUntil === 1
                          ? "Tomorrow"
                          : `In ${client.daysUntil}d`}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {client.service}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
