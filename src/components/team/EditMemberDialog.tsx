import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle, MailPlus, CheckCircle2, Clock, MailCheck, MailX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const roles = [
  { value: "facility_officer", label: "Facility Officer" },
  { value: "data_entry_officer", label: "Data Entry Officer" },
  { value: "program_manager", label: "Program Manager" },
];

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry Officer",
};

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    facility_id: string | null;
    role: string | null;
  };
  facilities: { id: string; name: string }[];
  onSuccess: () => void;
}

export function EditMemberDialog({ open, onOpenChange, member, facilities, onSuccess }: EditMemberDialogProps) {
  const { user } = useAuth();
  const [role, setRole] = useState(member.role || "facility_officer");
  const [facilityId, setFacilityId] = useState(member.facility_id || "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { statusOnly: true, user_id: member.user_id },
      });
      if (error) throw error;
      setInviteStatus(data);
      setCooldown(data?.cooldownRemaining ?? 0);
    } catch {
      setInviteStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, member.user_id]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const memberName = [member.first_name, member.last_name].filter(Boolean).join(" ") || "Unnamed User";
  const isSelf = user?.id === member.user_id;
  const roleChanged = role !== member.role;
  const facilityChanged = (facilityId || null) !== (member.facility_id || null);

  const handleResendInvite = async () => {
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { resend: true, user_id: member.user_id },
      });
      if (error) {
        const details =
          typeof (error as any)?.context?.text === "function"
            ? await (error as any).context.text()
            : error.message;
        let parsed: any = null;
        try { parsed = JSON.parse(details); } catch { /* not json */ }
        if (parsed?.cooldown) {
          setCooldown(parsed.retryAfterSeconds ?? 120);
          throw new Error(parsed.error);
        }
        throw new Error(parsed?.error || details || "Failed to resend invitation");
      }
      if (data?.error) throw new Error(data.error);

      if (data?.emailSent) {
        toast.success(`Invitation resent to ${data.email ?? memberName}`, {
          description: "A fresh temporary password is on its way.",
        });
      } else if (data?.tempPassword) {
        toast.success(`Temporary password reset for ${data.email ?? memberName}`, {
          description: `Email delivery unavailable. Share manually: ${data.tempPassword}`,
          duration: 20000,
        });
      } else {
        toast.info(data?.message || "Invitation processed");
      }

      setCooldown(data?.cooldownSeconds ?? 120);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to resend invitation");

    } finally {
      setResending(false);
    }
  };


  const performSave = async () => {
    setLoading(true);
    try {
      if (roleChanged && isSelf) {
        throw new Error("You cannot change your own role.");
      }

      const { data, error } = await supabase.functions.invoke("update-member", {
        body: {
          user_id: member.user_id,
          ...(roleChanged ? { role } : {}),
          ...(facilityChanged ? { facility_id: facilityId || null } : {}),
        },
      });

      if (error) {
        const details =
          typeof (error as any)?.context?.text === "function"
            ? await (error as any).context.text()
            : error.message;
        throw new Error(details || "Failed to update member");
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(`Updated ${memberName}`);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update member");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };


  const handleSave = () => {
    if (!roleChanged && !facilityChanged) {
      toast.info("No changes to save");
      return;
    }
    if (roleChanged) {
      setConfirmOpen(true);
      return;
    }
    performSave();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {memberName}</DialogTitle>
            <DialogDescription>
              Change role or facility assignment. All changes are recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Invitation status
                </Label>
                {statusLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              {!statusLoading && (
                <div className="flex flex-wrap items-center gap-2">
                  {inviteStatus?.accepted ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Accepted
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> Not accepted yet
                    </Badge>
                  )}
                  {inviteStatus?.lastSentAt ? (
                    <Badge variant="outline" className="gap-1">
                      {inviteStatus.lastSendOk === false ? (
                        <MailX className="h-3 w-3 text-destructive" />
                      ) : (
                        <MailCheck className="h-3 w-3" />
                      )}
                      {inviteStatus.lastSendOk === false ? "Last email failed" : "Email sent"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <MailX className="h-3 w-3" /> No email on record
                    </Badge>
                  )}
                </div>
              )}
              {!statusLoading && (
                <p className="text-xs text-muted-foreground">
                  {inviteStatus?.lastSentAt
                    ? `Last sent ${new Date(inviteStatus.lastSentAt).toLocaleString()} · ${
                        inviteStatus.sendCount ?? 1
                      } send${(inviteStatus.sendCount ?? 1) === 1 ? "" : "s"}`
                    : "This user has no invitation email on record."}
                  {inviteStatus?.acceptedAt
                    ? ` · Accepted ${new Date(inviteStatus.acceptedAt).toLocaleString()}`
                    : ""}
                </p>
              )}
              {inviteStatus?.lastSendOk === false && inviteStatus?.lastSendError && (
                <p className="text-xs text-destructive break-words">{inviteStatus.lastSendError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole} disabled={isSelf}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" />
                  You cannot change your own role.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Facility Assignment</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger>
                  <SelectValue placeholder="No facility assigned" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button
              variant="secondary"
              onClick={handleResendInvite}
              disabled={resending || loading || cooldown > 0}
              className="sm:mr-auto"
              title={cooldown > 0 ? `Cooldown active — wait ${cooldown}s` : undefined}
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailPlus className="h-4 w-4" />
              )}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend invite"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to change <strong>{memberName}</strong>'s role from{" "}
              <strong>{roleLabels[member.role ?? ""] ?? "—"}</strong> to{" "}
              <strong>{roleLabels[role]}</strong>. This will immediately affect what
              they can access. This action is logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
