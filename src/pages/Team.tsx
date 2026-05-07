import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Shield, Building2, Users } from "lucide-react";
import { toast } from "sonner";
import { InviteUserDialog } from "@/components/team/InviteUserDialog";
import { EditMemberDialog } from "@/components/team/EditMemberDialog";
import { PendingInvitations } from "@/components/team/PendingInvitations";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry",
};

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "system_admin": return "destructive" as const;
    case "program_manager": return "default" as const;
    case "facility_officer": return "secondary" as const;
    default: return "outline" as const;
  }
};

type TeamMember = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  facility_id: string | null;
  facility_name: string | null;
  role: string | null;
  email: string | null;
};

export default function TeamPage() {
  const { accountId, role } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const queryClient = useQueryClient();

  const isManager = role === "program_manager" || role === "system_admin";

  // Program managers and system admins query without account scope; RLS narrows PMs to their LGA.
  const skipAccountFilter = role === "system_admin" || role === "program_manager";

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", accountId, skipAccountFilter],
    queryFn: async () => {
      let pq = supabase
        .from("profiles")
        .select("user_id, first_name, last_name, facility_id");
      if (!skipAccountFilter) pq = pq.eq("account_id", accountId!);
      const { data: profiles, error } = await pq;

      if (error) throw error;

      // Fetch roles and facilities in parallel
      const userIds = profiles.map((p) => p.user_id);
      const facilityIds = [...new Set(profiles.map((p) => p.facility_id).filter(Boolean))];

      const [rolesRes, facilitiesRes] = await Promise.all([
        userIds.length > 0
          ? supabase.from("user_roles").select("user_id, role").in("user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
        facilityIds.length > 0
          ? supabase.from("facilities").select("id, name").in("id", facilityIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const roleMap = new Map<string, string>((rolesRes.data ?? []).map((r) => [r.user_id, r.role]));
      const facilityMap = new Map<string, string>((facilitiesRes.data ?? []).map((f) => [f.id, f.name]));

      return profiles.map((p) => ({
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        facility_id: p.facility_id,
        facility_name: p.facility_id ? facilityMap.get(p.facility_id) ?? null : null,
        role: roleMap.get(p.user_id) ?? null,
        email: null,
      })) as TeamMember[];
    },
    enabled: !!accountId && isManager,
  });

  const { data: facilities = [] } = useQuery({
    queryKey: ["facilities", accountId, skipAccountFilter],
    queryFn: async () => {
      let q = supabase.from("facilities").select("id, name").order("name");
      if (!skipAccountFilter) q = q.eq("account_id", accountId!);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("account_id", accountId!)
        .eq("status", "pending");
      if (error) throw error;
      return data;
    },
    enabled: !!accountId && isManager,
  });

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">Only program managers and admins can manage the team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Team Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Invite users, assign roles, and manage facility assignments.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Invite User</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-muted-foreground">Team Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{facilities.length}</p>
              <p className="text-xs text-muted-foreground">Facilities</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-6 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{invitations.length}</p>
              <p className="text-xs text-muted-foreground">Pending Invites</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Loading team...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No team members yet. Invite someone to get started.</p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Facility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {member.first_name || member.last_name
                              ? `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
                              : "Unnamed User"}
                          </p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {member.facility_name ?? "No facility"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.role ? (
                          <Badge variant={roleBadgeVariant(member.role)}>
                            {roleLabels[member.role] ?? member.role}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No role</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {member.facility_name ?? (
                          <span className="text-muted-foreground text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMember(member)}
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

      <PendingInvitations
        invitations={invitations as any}
        facilities={facilities}
        onRevoked={() => {
          queryClient.invalidateQueries({ queryKey: ["invitations"] });
          queryClient.invalidateQueries({ queryKey: ["team-members"] });
        }}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        facilities={facilities}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["team-members"] });
          queryClient.invalidateQueries({ queryKey: ["invitations"] });
        }}
      />

      {editMember && (
        <EditMemberDialog
          open={!!editMember}
          onOpenChange={(open) => !open && setEditMember(null)}
          member={editMember}
          facilities={facilities}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            setEditMember(null);
          }}
        />
      )}
    </div>
  );
}
