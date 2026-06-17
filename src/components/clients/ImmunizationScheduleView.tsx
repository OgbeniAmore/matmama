
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ImmunizationRecord } from "@/types/immunization";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Syringe, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ImmunizationScheduleViewProps {
  clientId: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> = {
  Administered: { icon: CheckCircle2, color: "text-green-600", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  Pending: { icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  Missed: { icon: AlertCircle, color: "text-red-600", badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

export function ImmunizationScheduleView({ clientId }: ImmunizationScheduleViewProps) {
  const queryClient = useQueryClient();

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

  const markAdministered = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from("immunization_records")
        .update({
          status: "Administered",
          administered_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", recordId);
      if (error) throw error;
      const { error: rpcError } = await supabase.rpc("resync_client_status", { _client_id: clientId });
      if (rpcError) console.warn("resync_client_status failed:", rpcError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["immunization-records", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      toast.success("Vaccine marked as administered");
    },
    onError: (error) => {
      toast.error("Failed to update vaccine status");
      console.error(error);
    },
  });

  const undoAdministered = useMutation({
    mutationFn: async (recordId: string) => {
      const { error } = await supabase
        .from("immunization_records")
        .update({
          status: "Pending",
          administered_date: null,
        })
        .eq("id", recordId);
      if (error) throw error;
      const { error: rpcError } = await supabase.rpc("resync_client_status", { _client_id: clientId });
      if (rpcError) console.warn("resync_client_status failed:", rpcError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["immunization-records", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["defaulters"] });
      toast.success("Vaccine status reverted to pending");
    },
    onError: (error) => {
      toast.error("Failed to update vaccine status");
      console.error(error);
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

  const administered = records.filter(r => r.status === "Administered").length;
  const total = records.length;
  const progressPercent = total > 0 ? Math.round((administered / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Syringe className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">EPI Immunization Schedule</h3>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {administered} of {total} vaccines administered
          </span>
          <span className="text-muted-foreground font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
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
                  const isAdministered = vaccine.status === "Administered";
                  const isPending = vaccine.status === "Pending" || vaccine.status === "Missed";
                  return (
                    <div key={vaccine.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                        <span className="text-sm truncate">{vaccine.vaccine_name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className={config.badgeClass}>
                          {vaccine.status}
                        </Badge>
                        {isPending && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            disabled={markAdministered.isPending}
                            onClick={() => markAdministered.mutate(vaccine.id)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Administer
                          </Button>
                        )}
                        {isAdministered && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-muted-foreground"
                            disabled={undoAdministered.isPending}
                            onClick={() => undoAdministered.mutate(vaccine.id)}
                          >
                            Undo
                          </Button>
                        )}
                      </div>
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
