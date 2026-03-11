import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowRightLeft, Loader2 } from "lucide-react";

const statusColors: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

interface TransferHistoryViewProps {
  clientId: string;
}

export function TransferHistoryView({ clientId }: TransferHistoryViewProps) {
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["client-transfer-history", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfer_requests")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const facilityIds = [...new Set(transfers.flatMap((t) => [t.source_facility_id, t.target_facility_id]))];

  const { data: facilities = [] } = useQuery({
    queryKey: ["transfer-history-facilities", facilityIds],
    queryFn: async () => {
      if (facilityIds.length === 0) return [];
      const { data } = await supabase.from("facilities").select("id, name").in("id", facilityIds);
      return data || [];
    },
    enabled: facilityIds.length > 0,
  });

  const facilityMap = Object.fromEntries(facilities.map((f) => [f.id, f.name]));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No transfer history for this client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4" />
        Transfer History
      </h3>
      <div className="space-y-2">
        {transfers.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-muted-foreground">From</span>
                <span className="font-medium truncate">{facilityMap[t.source_facility_id] || "Unknown"}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium truncate">{facilityMap[t.target_facility_id] || "Unknown"}</span>
              </div>
              {t.notes && <p className="text-xs text-muted-foreground truncate">{t.notes}</p>}
              <p className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM yyyy, HH:mm")}</p>
            </div>
            <Badge variant={statusColors[t.status] || "outline"} className="shrink-0">
              {t.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
