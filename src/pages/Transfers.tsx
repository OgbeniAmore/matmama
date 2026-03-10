import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowRightLeft, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const TransfersPage = () => {
  const { accountId, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isManager = role === "program_manager" || role === "system_admin" || role === "facility_officer";

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["transfer-requests", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfer_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  // Fetch client names and facility names for display
  const clientIds = [...new Set(transfers.map((t) => t.client_id))];
  const facilityIds = [...new Set(transfers.flatMap((t) => [t.source_facility_id, t.target_facility_id]))];

  const { data: clients = [] } = useQuery({
    queryKey: ["transfer-clients", clientIds],
    queryFn: async () => {
      if (clientIds.length === 0) return [];
      const { data } = await supabase.from("clients").select("id, name").in("id", clientIds);
      return data || [];
    },
    enabled: clientIds.length > 0,
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["transfer-facilities", facilityIds],
    queryFn: async () => {
      if (facilityIds.length === 0) return [];
      const { data } = await supabase.from("facilities").select("id, name").in("id", facilityIds);
      return data || [];
    },
    enabled: facilityIds.length > 0,
  });

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c.name]));
  const facilityMap = Object.fromEntries(facilities.map((f) => [f.id, f.name]));

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from("transfer_requests")
        .update({ status, approved_by: userId } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: status === "approved" ? "Transfer Approved" : "Transfer Rejected", description: status === "approved" ? "The client has been moved to the target facility." : "The transfer request was rejected." });
      queryClient.invalidateQueries({ queryKey: ["transfer-requests"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const incoming = transfers.filter((t) => t.target_account_id === accountId);
  const outgoing = transfers.filter((t) => t.source_account_id === accountId && t.target_account_id !== accountId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transfer Requests</h1>
        <p className="text-muted-foreground">Manage client transfer requests between facilities.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Incoming Requests</CardTitle>
              <CardDescription>Transfer requests from other facilities to bring clients into your care.</CardDescription>
            </CardHeader>
            <CardContent>
              {incoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No incoming transfer requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>From Facility</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      {isManager && <TableHead>Action</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incoming.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{clientMap[t.client_id] || t.client_id}</TableCell>
                        <TableCell>{facilityMap[t.source_facility_id] || "Other Account"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{t.notes || "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(t.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell><Badge variant={statusColors[t.status] || "outline"}>{t.status}</Badge></TableCell>
                        {isManager && (
                          <TableCell>
                            {t.status === "pending" ? (
                              <div className="flex gap-1">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="default" disabled={updateMutation.isPending}>
                                      <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Approve Transfer?</AlertDialogTitle>
                                      <AlertDialogDescription>This will move the client to your facility. The source facility will lose access.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => updateMutation.mutate({ id: t.id, status: "approved" })}>Approve</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive" disabled={updateMutation.isPending}>
                                      <XCircle className="h-3 w-3 mr-1" />Reject
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reject Transfer?</AlertDialogTitle>
                                      <AlertDialogDescription>The client will remain at the source facility.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => updateMutation.mutate({ id: t.id, status: "rejected" })}>Reject</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Resolved</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Outgoing Requests</CardTitle>
              <CardDescription>Transfer requests you've submitted to other facilities.</CardDescription>
            </CardHeader>
            <CardContent>
              {outgoing.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No outgoing transfer requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>To Facility</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outgoing.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{clientMap[t.client_id] || t.client_id}</TableCell>
                        <TableCell>{facilityMap[t.target_facility_id] || "Other Account"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{t.notes || "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(t.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell><Badge variant={statusColors[t.status] || "outline"}>{t.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TransfersPage;
