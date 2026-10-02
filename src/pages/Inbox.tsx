import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Inbox as InboxIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SharedClientsCard } from "@/components/roster/SharedClientsCard";

const InboxPage = () => {
  const { accountId, role, profile } = useAuth() as any;
  const facilityId: string | null = profile?.facility_id ?? null;
  const canAct = ["system_admin", "program_manager", "facility_officer"].includes(role);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pending = [], isLoading } = useQuery<any[]>({
    queryKey: ["inbox-pending", accountId, facilityId],
    enabled: !!accountId,
    queryFn: async () => {
      const sb: any = supabase;
      let q = sb
        .from("transfer_requests")
        .select(
          "*, client:clients(name, child_name), source:facilities!transfer_requests_source_facility_id_fkey(name), target:facilities!transfer_requests_target_facility_id_fkey(name)",
        )
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      q = facilityId ? q.eq("source_facility_id", facilityId) : q.eq("source_account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from("transfer_requests")
        .update({ status, approved_by: userId ?? null })
        .eq("id", id);
      if (error) throw error;
      await supabase.functions.invoke("notify-transfer", { body: { transferId: id, event: status } });
    },
    onSuccess: (_, { status }) => {
      toast({ title: status === "approved" ? "Approved" : "Rejected" });
      qc.invalidateQueries({ queryKey: ["inbox-pending"] });
      qc.invalidateQueries({ queryKey: ["active-shares"] });
      qc.invalidateQueries({ queryKey: ["transfer-requests"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><InboxIcon className="h-7 w-7" />Facility Inbox</h1>
        <p className="text-muted-foreground">Pending transfer and share requests, plus clients currently shared.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Pending requests <Badge variant="outline">{pending.length}</Badge>
          </CardTitle>
          <CardDescription>Other facilities asking to take over or temporarily share your clients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nothing waiting for review.</p>
          ) : (
            pending.map((t) => {
              const temp = t.transfer_type === "temporary";
              return (
                <div key={t.id} className="rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">
                        {t.client?.child_name ? `${t.client.child_name} (${t.client.name})` : t.client?.name ?? t.client_id}
                      </p>
                      <Badge variant={temp ? "secondary" : "default"}>{temp ? "Temporary share" : "Permanent transfer"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested by {t.target?.name ?? "another facility"} · {format(new Date(t.created_at), "dd MMM yyyy")}
                      {t.reason ? ` · ${t.reason}` : ""}
                    </p>
                    {temp && t.share_expires_at && (
                      <p className="text-xs text-muted-foreground">Share until {format(new Date(t.share_expires_at), "dd MMM yyyy")}</p>
                    )}
                    {t.notes && <p className="text-xs text-muted-foreground">“{t.notes}”</p>}
                  </div>
                  {canAct && (
                    <div className="flex gap-2">
                      <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: t.id, status: "approved" })}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive" disabled={decide.isPending} onClick={() => decide.mutate({ id: t.id, status: "rejected" })}>
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <SharedClientsCard facilityId={facilityId} />
    </div>
  );
};

export default InboxPage;
