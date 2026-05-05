import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";
import { AdminStats } from "@/components/admin/AdminStats";
import { LgaPerformanceGrid, LgaStat } from "@/components/admin/LgaPerformanceGrid";
import { AdminTeamSection, AdminTeamMember } from "@/components/admin/AdminTeamSection";
import { InviteUserDialog } from "@/components/team/InviteUserDialog";
import { LgaTrendChart } from "@/components/admin/LgaTrendChart";

export default function AdminDashboard() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Hard gate
  if (role !== "system_admin") {
    return <Navigate to="/" replace />;
  }

  // Fetch all data in parallel
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        clientsRes,
        facilitiesRes,
        profilesRes,
        rolesRes,
        remindersRes,
      ] = await Promise.all([
        supabase.from("clients").select("id, status, facility_id"),
        supabase.from("facilities").select("id, name, lga"),
        supabase.from("profiles").select("user_id, first_name, last_name, facility_id, lga"),
        supabase.from("user_roles").select("user_id, role"),
        supabase
          .from("patient_reminders")
          .select("id", { count: "exact", head: true })
          .gte("sent_at", since7d),
      ]);

      const clients = clientsRes.data ?? [];
      const facilities = facilitiesRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const roles = rolesRes.data ?? [];

      const roleMap = new Map(roles.map((r) => [r.user_id, r.role as string]));
      const facilityMap = new Map(facilities.map((f) => [f.id, f]));

      // Stats
      const defaulters = clients.filter((c) => c.status === "Defaulting").length;
      const activeLgas = new Set(
        facilities.map((f) => f.lga).filter(Boolean) as string[],
      ).size;

      // Per-LGA aggregation
      const lgaMap = new Map<string, LgaStat>();
      for (const f of facilities) {
        if (!f.lga) continue;
        if (!lgaMap.has(f.lga)) {
          lgaMap.set(f.lga, {
            lga: f.lga,
            facilities: 0,
            clients: 0,
            defaulters: 0,
            programManager: null,
          });
        }
        lgaMap.get(f.lga)!.facilities += 1;
      }

      for (const c of clients) {
        const fac = c.facility_id ? facilityMap.get(c.facility_id) : null;
        if (!fac?.lga) continue;
        const entry = lgaMap.get(fac.lga);
        if (!entry) continue;
        entry.clients += 1;
        if (c.status === "Defaulting") entry.defaulters += 1;
      }

      // Find program managers per LGA
      for (const p of profiles) {
        if (!p.lga) continue;
        if (roleMap.get(p.user_id) !== "program_manager") continue;
        const entry = lgaMap.get(p.lga);
        if (!entry) continue;
        entry.programManager =
          [p.first_name, p.last_name].filter(Boolean).join(" ") || "Assigned";
      }

      // Build team list for the table
      const team: AdminTeamMember[] = profiles.map((p) => ({
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        facility_name: p.facility_id
          ? facilityMap.get(p.facility_id)?.name ?? null
          : null,
        lga: p.lga,
        role: roleMap.get(p.user_id) ?? null,
      }));

      return {
        stats: {
          totalClients: clients.length,
          defaulters,
          facilities: facilities.length,
          teamMembers: profiles.length,
          remindersSent7d: remindersRes.count ?? 0,
          activeLgas,
        },
        lgaStats: Array.from(lgaMap.values()),
        team,
        facilities,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            System Admin
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            State-wide oversight across all 20 Lagos LGAs.
          </p>
        </div>
      </div>

      <AdminStats stats={data?.stats} isLoading={isLoading} />

      <LgaPerformanceGrid data={data?.lgaStats} isLoading={isLoading} />

      <AdminTeamSection
        members={data?.team ?? []}
        isLoading={isLoading}
        onInvite={() => setInviteOpen(true)}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        facilities={data?.facilities ?? []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
        }}
      />
    </div>
  );
}
