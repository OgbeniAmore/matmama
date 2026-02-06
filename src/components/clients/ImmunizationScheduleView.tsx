
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImmunizationRecord } from "@/types/immunization";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Syringe, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ImmunizationScheduleViewProps {
  clientId: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> = {
  Administered: { icon: CheckCircle2, color: "text-green-600", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  Pending: { icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  Missed: { icon: AlertCircle, color: "text-red-600", badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

export function ImmunizationScheduleView({ clientId }: ImmunizationScheduleViewProps) {
  const { data: records = [], isLoading } = useQuery<ImmunizationRecord[]>({
    queryKey: ["immunization-records", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("immunization_records")
        .select("*")
        .eq("client_id", clientId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as ImmunizationRecord[];
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

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No immunization schedule found.</p>
    );
  }

  // Group by age_weeks for cleaner display
  const grouped = records.reduce<Record<number, ImmunizationRecord[]>>((acc, record) => {
    const week = record.age_weeks ?? 0;
    if (!acc[week]) acc[week] = [];
    acc[week].push(record);
    return acc;
  }, {});

  const weekLabels: Record<number, string> = {
    0: "At Birth",
    6: "6 Weeks",
    10: "10 Weeks",
    14: "14 Weeks",
    24: "6 Months",
    39: "9 Months",
    65: "15 Months",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Syringe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">EPI Immunization Schedule</h3>
      </div>
      {Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([weekStr, vaccines]) => {
          const week = Number(weekStr);
          return (
            <div key={week} className="border rounded-lg p-3">
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                {weekLabels[week] || `${week} Weeks`} — {format(new Date(vaccines[0].due_date), "PP")}
              </h4>
              <div className="space-y-1.5">
                {vaccines.map((vaccine) => {
                  const config = statusConfig[vaccine.status] || statusConfig.Pending;
                  const StatusIcon = config.icon;
                  return (
                    <div key={vaccine.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm">{vaccine.vaccine_name}</span>
                      </div>
                      <Badge variant="outline" className={config.badgeClass}>
                        {vaccine.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
