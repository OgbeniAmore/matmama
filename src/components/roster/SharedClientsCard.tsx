import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";
import { Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShareRow {
  id: string;
  client_id: string;
  reason: string | null;
  updated_at: string;
  share_expires_at: string;
  source_facility_id: string;
  target_facility_id: string;
  client: { name: string; child_name: string | null } | null;
  source: { name: string } | null;
  target: { name: string } | null;
}

export function SharedClientsCard({ facilityId }: { facilityId: string | null }) {
  const { data: shares = [], isLoading } = useQuery<ShareRow[]>({
    queryKey: ["active-shares", facilityId],
    enabled: !!facilityId,
    queryFn: async () => {
      const sb: any = supabase;
      const { data, error } = await sb
        .from("transfer_requests")
        .select(
          "id, client_id, reason, updated_at, share_expires_at, source_facility_id, target_facility_id, client:clients(name, child_name), source:facilities!transfer_requests_source_facility_id_fkey(name), target:facilities!transfer_requests_target_facility_id_fkey(name)",
        )
        .eq("transfer_type", "temporary")
        .eq("status", "approved")
        .gt("share_expires_at", new Date().toISOString())
        .or(`source_facility_id.eq.${facilityId},target_facility_id.eq.${facilityId}`)
        .order("share_expires_at", { ascending: true });
      if (error) throw error;
      return data as ShareRow[];
    },
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Shared clients</h2>
          <Badge variant="outline">{shares.length}</Badge>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients are currently shared with or from this facility.</p>
        ) : (
          <div className="space-y-2">
            {shares.map((s) => {
              const start = new Date(s.updated_at);
              const end = new Date(s.share_expires_at);
              const total = Math.max(1, differenceInCalendarDays(end, start));
              const left = differenceInCalendarDays(end, new Date());
              const incoming = s.target_facility_id === facilityId;
              return (
                <div key={s.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.client?.child_name ? `${s.client.child_name} (${s.client.name})` : s.client?.name ?? s.client_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {incoming ? `From ${s.source?.name ?? "—"}` : `To ${s.target?.name ?? "—"}`}
                      {s.reason ? ` · ${s.reason}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(start, "PP")} → {format(end, "PP")} · {total} day{total === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={left <= 3 ? "destructive" : "secondary"}>
                    {left <= 0 ? "Ends today" : `${left} day${left === 1 ? "" : "s"} left`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
