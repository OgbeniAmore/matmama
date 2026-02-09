import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";

const roles = [
  { value: "facility_officer", label: "Facility Officer" },
  { value: "data_entry_officer", label: "Data Entry Officer" },
  { value: "program_manager", label: "Program Manager" },
];

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
  const [role, setRole] = useState(member.role || "facility_officer");
  const [facilityId, setFacilityId] = useState(member.facility_id || "");
  const [loading, setLoading] = useState(false);

  const memberName = [member.first_name, member.last_name].filter(Boolean).join(" ") || "Unnamed User";

  const handleSave = async () => {
    setLoading(true);
    try {
      // Update role
      const { error: roleError } = await supabase
        .from("user_roles")
        .update({ role: role as any })
        .eq("user_id", member.user_id);

      if (roleError) throw roleError;

      // Update facility
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ facility_id: facilityId || null })
        .eq("user_id", member.user_id);

      if (profileError) throw profileError;

      toast.success(`Updated ${memberName}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to update member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {memberName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
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
  );
}
