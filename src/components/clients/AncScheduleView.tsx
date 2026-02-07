
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AncVisit } from "@/types/anc";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { HeartPulse, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AncScheduleViewProps {
  clientId: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; badgeClass: string }> = {
  Completed: { icon: CheckCircle2, color: "text-green-600", badgeClass: "bg-green-100 text-green-800 border-green-200" },
  Pending: { icon: Clock, color: "text-amber-600", badgeClass: "bg-amber-100 text-amber-800 border-amber-200" },
  Missed: { icon: AlertCircle, color: "text-red-600", badgeClass: "bg-red-100 text-red-800 border-red-200" },
};

export function AncScheduleView({ clientId }: AncScheduleViewProps) {
  const queryClient = useQueryClient();

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

  const markCompleted = useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await supabase
        .from("anc_visits")
        .update({
          status: "Completed",
          actual_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anc-visits", clientId] });
      toast.success("ANC visit marked as completed");
    },
    onError: (error) => {
      toast.error("Failed to update visit status");
      console.error(error);
    },
  });

  const undoCompleted = useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await supabase
        .from("anc_visits")
        .update({
          status: "Pending",
          actual_date: null,
        })
        .eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anc-visits", clientId] });
      toast.success("Visit status reverted to pending");
    },
    onError: (error) => {
      toast.error("Failed to update visit status");
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

  if (visits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No ANC visit schedule found.</p>
    );
  }

  const completed = visits.filter(v => v.status === "Completed").length;
  const total = visits.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <HeartPulse className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Antenatal Care (ANC) Schedule</h3>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {completed} of {total} visits completed
          </span>
          <span className="text-muted-foreground font-medium">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
      <div className="space-y-2">
        {visits.map((visit) => {
          const config = statusConfig[visit.status] || statusConfig.Pending;
          const StatusIcon = config.icon;
          const isCompleted = visit.status === "Completed";
          const isPending = visit.status === "Pending" || visit.status === "Missed";
          return (
            <div key={visit.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon className={`h-5 w-5 flex-shrink-0 ${config.color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{visit.visit_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Week {visit.gestational_weeks} — {format(new Date(visit.scheduled_date), "PP")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={config.badgeClass}>
                  {visit.status}
                </Badge>
                {isPending && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    disabled={markCompleted.isPending}
                    onClick={() => markCompleted.mutate(visit.id)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                )}
                {isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-2 text-muted-foreground"
                    disabled={undoCompleted.isPending}
                    onClick={() => undoCompleted.mutate(visit.id)}
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
}
