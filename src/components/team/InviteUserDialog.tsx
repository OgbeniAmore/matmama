import { useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LAGOS_LGAS } from "@/lib/lagos-lgas";

const baseRoles = [
  { value: "facility_officer", label: "Facility Officer" },
  { value: "data_entry_officer", label: "Data Entry Officer" },
  { value: "program_manager", label: "Program Manager" },
];

const adminRoles = [
  ...baseRoles,
  { value: "system_admin", label: "System Admin" },
];

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilities: { id: string; name: string; lga?: string | null }[];
  onSuccess: () => void;
  /** When true, restricts available roles + LGAs (used by Program Managers). */
  scopedToLga?: string | null;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  facilities,
  onSuccess,
  scopedToLga = null,
}: InviteUserDialogProps) {
  const { role: currentRole } = useAuth();
  const isSystemAdmin = currentRole === "system_admin";

  const availableRoles = useMemo(() => {
    if (isSystemAdmin) return adminRoles;
    // Program Managers can only invite officers within their own LGA
    return baseRoles.filter((r) => r.value !== "program_manager");
  }, [isSystemAdmin]);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState(availableRoles[0]?.value ?? "facility_officer");
  const [facilityId, setFacilityId] = useState("");
  const [lga, setLga] = useState<string>(scopedToLga ?? "");
  const [loading, setLoading] = useState(false);

  const requiresLga = role === "program_manager";
  const showLgaPicker = isSystemAdmin && requiresLga;

  // Filter facilities by LGA when relevant
  const visibleFacilities = useMemo(() => {
    const targetLga = scopedToLga ?? (lga || null);
    if (!targetLga) return facilities;
    return facilities.filter((f) => !f.lga || f.lga === targetLga);
  }, [facilities, lga, scopedToLga]);

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    if (requiresLga && !lga && !scopedToLga) {
      toast.error("Please select an LGA for the Program Manager");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: {
          email,
          role,
          facility_id: facilityId || null,
          lga: scopedToLga ?? (lga || null),
        },
      });

      if (error) throw error;

      if (data?.emailSent) {
        toast.success(`Invitation email sent to ${email}`, {
          description: "They'll receive their temporary password shortly.",
        });
      } else if (data?.tempPassword) {
        toast.success(`User created for ${email}`, {
          description: `Email delivery unavailable. Share this temp password manually: ${data.tempPassword}`,
          duration: 20000,
        });
      } else {
        toast.success(data?.message || `${email} added to team`);
      }

      setEmail("");
      setRole(availableRoles[0]?.value ?? "facility_officer");
      setFacilityId("");
      if (!scopedToLga) setLga("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            {isSystemAdmin
              ? "Invite an admin, program manager, or facility staff."
              : "Invite a facility officer or data entry officer to your LGA."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showLgaPicker && (
            <div className="space-y-2">
              <Label>LGA Assignment <span className="text-destructive">*</span></Label>
              <Select value={lga} onValueChange={setLga}>
                <SelectTrigger>
                  <SelectValue placeholder="Select LGA (one PM per LGA)" />
                </SelectTrigger>
                <SelectContent>
                  {LAGOS_LGAS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only one Program Manager may be assigned per LGA.
              </p>
            </div>
          )}

          {role !== "system_admin" && role !== "program_manager" && (
            <div className="space-y-2">
              <Label>Facility Assignment</Label>
              <Select value={facilityId} onValueChange={setFacilityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a facility (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {visibleFacilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
