
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AncVisit } from "@/types/anc";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HeartPulse, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface AncScheduleViewProps {
  clientId: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> = {
  Completed: { icon: CheckCircle2, color: "text-green-600", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  Pending: { icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  Missed: { icon: AlertCircle, color: "text-red-600", badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

export function AncScheduleView({ clientId }: AncScheduleViewProps) {
  const { data: visits = [], isLoading } = useQuery<AncVisit[]>({
    queryKey: ["anc-visits", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("anc_visits")
        .select("*")
        .eq("client_id", clientId)
        .order("visit_number", { ascending: true });

      if (error) throw error;
      return data as AncVisit[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No ANC visit schedule found.</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <HeartPulse className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Antenatal Care (ANC) Schedule</h3>
      </div>
      <div className="space-y-2">
        {visits.map((visit) => {
          const config = statusConfig[visit.status] || statusConfig.Pending;
          const StatusIcon = config.icon;
          return (
            <div key={visit.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
                <div>
                  <p className="text-sm font-medium">{visit.visit_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Week {visit.gestational_weeks} — {format(new Date(visit.scheduled_date), "PP")}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={config.badgeClass}>
                {visit.status}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
