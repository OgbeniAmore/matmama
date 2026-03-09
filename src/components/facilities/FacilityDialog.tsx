import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface FacilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: {
    id: string;
    name: string;
    address: string | null;
    ward: string | null;
    local_government: string | null;
  } | null;
  onSuccess: () => void;
}

export function FacilityDialog({ open, onOpenChange, facility, onSuccess }: FacilityDialogProps) {
  const { accountId } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [ward, setWard] = useState("");
  const [localGovernment, setLocalGovernment] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!facility;

  useEffect(() => {
    if (facility) {
      setName(facility.name);
      setAddress(facility.address || "");
      setWard(facility.ward || "");
      setLocalGovernment(facility.local_government || "");
    } else {
      setName("");
      setAddress("");
      setWard("");
      setLocalGovernment("");
    }
  }, [facility, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Facility name is required");
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("facilities")
          .update({
            name: name.trim(),
            address: address.trim() || null,
            ward: ward.trim() || null,
            local_government: localGovernment.trim() || null,
          })
          .eq("id", facility.id);
        if (error) throw error;
        toast.success("Facility updated");
      } else {
        const { error } = await supabase
          .from("facilities")
          .insert({
            name: name.trim(),
            address: address.trim() || null,
            ward: ward.trim() || null,
            local_government: localGovernment.trim() || null,
            account_id: accountId!,
          });
        if (error) throw error;
        toast.success("Facility created");
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save facility");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Facility" : "Add Facility"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="facility-name">Name *</Label>
            <Input
              id="facility-name"
              placeholder="e.g. PHC Wuse II"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facility-address">Address</Label>
            <Input
              id="facility-address"
              placeholder="Street address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="facility-ward">Ward</Label>
              <Input
                id="facility-ward"
                placeholder="Ward name"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facility-lga">Local Government</Label>
              <Input
                id="facility-lga"
                placeholder="LGA"
                value={localGovernment}
                onChange={(e) => setLocalGovernment(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Facility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
