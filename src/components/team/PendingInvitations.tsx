import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, isPast } from "date-fns";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry",
};

interface Invitation {
  id: string;
  email: string;
  role: string;
  facility_id: string | null;
  expires_at: string;
  created_at: string;
  status: string;
}

interface PendingInvitationsProps {
  invitations: Invitation[];
  facilities: { id: string; name: string }[];
  onRevoked: () => void;
}

export function PendingInvitations({ invitations, facilities, onRevoked }: PendingInvitationsProps) {
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<Invitation | null>(null);

  const facilityName = (id: string | null) =>
    id ? facilities.find((f) => f.id === id)?.name ?? "Unknown" : "Unassigned";

  const handleRevoke = async (invitation: Invitation) => {
    setRevoking(invitation.id);
    try {
      const { error } = await supabase.functions.invoke("revoke-invitation", {
        body: { invitation_id: invitation.id },
      });
      if (error) throw error;
      toast.success(`Invitation for ${invitation.email} revoked`);
      onRevoked();
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invitation");
    } finally {
      setRevoking(null);
      setConfirmRevoke(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Pending Invitations
            <Badge variant="secondary" className="ml-1">{invitations.length}</Badge>
          </CardTitle>
          <CardDescription>
            Invitees who haven't signed in yet. Revoke to disable their access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map((inv) => {
            const expired = isPast(new Date(inv.expires_at));
            return (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{inv.email}</p>
                    <Badge variant="outline">{roleLabels[inv.role] ?? inv.role}</Badge>
                    {expired && <Badge variant="destructive">Expired</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{facilityName(inv.facility_id)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {expired
                        ? `Expired ${formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}`
                        : `Expires ${formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}`}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRevoke(inv)}
                  disabled={revoking === inv.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {revoking === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Revoke
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(o) => !o && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRevoke?.email} will no longer be able to sign in with their invitation.
              You can re-invite them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRevoke && handleRevoke(confirmRevoke)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
