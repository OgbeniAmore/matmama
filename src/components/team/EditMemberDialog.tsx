import { useState } from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";

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
      if (error) throw error;
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
          <DialogFooter>
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
