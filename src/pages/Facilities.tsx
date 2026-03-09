import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Shield, MapPin } from "lucide-react";
import { FacilityDialog } from "@/components/facilities/FacilityDialog";

type Facility = {
  id: string;
  name: string;
  address: string | null;
  ward: string | null;
  local_government: string | null;
  created_at: string;
};

export default function FacilitiesPage() {
  const { accountId, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFacility, setEditFacility] = useState<Facility | null>(null);

  const isManager = role === "program_manager" || role === "system_admin";

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["facilities-page", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, address, ward, local_government, created_at")
        .eq("account_id", accountId!)
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
    enabled: !!accountId,
  });

  // Count team members per facility
  const { data: memberCounts = {} } = useQuery({
    queryKey: ["facility-member-counts", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("facility_id")
        .eq("account_id", accountId!)
        .not("facility_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((p) => {
        if (p.facility_id) counts[p.facility_id] = (counts[p.facility_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!accountId,
  });

  const { data: clientCounts = {} } = useQuery({
    queryKey: ["facility-client-counts", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("facility_id")
        .eq("account_id", accountId!)
        .not("facility_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((c) => {
        if (c.facility_id) counts[c.facility_id] = (counts[c.facility_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!accountId,
  });

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Only program managers and admins can manage facilities.</p>
      </div>
    );
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["facilities-page"] });
    queryClient.invalidateQueries({ queryKey: ["facilities"] });
    queryClient.invalidateQueries({ queryKey: ["facility-member-counts"] });
    setDialogOpen(false);
    setEditFacility(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Facilities</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create and manage health facilities in your organization.
          </p>
        </div>
        <Button onClick={() => { setEditFacility(null); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Facility</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{facilities.length}</p>
              <p className="text-xs text-muted-foreground">Total Facilities</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">
                {new Set(facilities.map((f) => f.local_government).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted-foreground">Local Governments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading facilities...</p>
          ) : facilities.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No facilities yet. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Ward</TableHead>
                    <TableHead className="hidden md:table-cell">LGA</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((facility) => (
                    <TableRow key={facility.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{facility.name}</p>
                          {facility.address && (
                            <p className="text-xs text-muted-foreground sm:hidden truncate max-w-[180px]">
                              {facility.address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {facility.ward || <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {facility.local_government || <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {memberCounts[facility.id] || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditFacility(facility); setDialogOpen(true); }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <FacilityDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditFacility(null); }}
        facility={editFacility}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
