import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  UserRound,
  Activity,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const roleLabels: Record<string, string> = {
  system_admin: "System Admin",
  program_manager: "Program Manager",
  facility_officer: "Facility Officer",
  data_entry_officer: "Data Entry",
};

type FacilityStatus = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  tone: "ok" | "warn" | "alert";
};

function deriveStatus(staffCount: number, clientCount: number): FacilityStatus {
  if (staffCount === 0) {
    return { label: "No staff assigned", variant: "destructive", tone: "alert" };
  }
  if (clientCount > 0 && clientCount / staffCount > 100) {
    return { label: "At capacity", variant: "secondary", tone: "warn" };
  }
  if (staffCount < 2) {
    return { label: "Low staff", variant: "secondary", tone: "warn" };
  }
  return { label: "Active", variant: "default", tone: "ok" };
}

export default function FacilityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accountId, role } = useAuth();
  const isManager = role === "program_manager" || role === "system_admin";

  const { data: facility, isLoading } = useQuery({
    queryKey: ["facility-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", id!)
        .eq("account_id", accountId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["facility-staff", id],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .eq("facility_id", id!)
        .eq("account_id", accountId!);
      if (error) throw error;

      const userIds = profiles.map((p) => p.user_id);
      if (userIds.length === 0) return [];

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
      return profiles.map((p) => ({
        ...p,
        role: roleMap.get(p.user_id) ?? null,
      }));
    },
    enabled: !!id && !!accountId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["facility-clients", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, service, status, due_date")
        .eq("facility_id", id!)
        .eq("account_id", accountId!)
        .order("due_date", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId,
  });

  const { data: activity = [] } = useQuery({
    queryKey: ["facility-activity", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, table_name, created_at, new_data")
        .eq("account_id", accountId!)
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!accountId && isManager,
  });

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground mt-2">
          Only program managers and admins can view facility details.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Facility not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/facilities")}>
          Back to facilities
        </Button>
      </div>
    );
  }

  const status = deriveStatus(staff.length, clients.length);
  const defaulters = clients.filter((c) => c.status === "Defaulting").length;
  const onTrack = clients.filter((c) => c.status === "On Track").length;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link to="/facilities">
          <ArrowLeft className="h-4 w-4" />
          Facilities
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="h-7 w-7 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">{facility.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {(facility.address || facility.ward || facility.local_government) && (
            <p className="text-muted-foreground text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {[facility.address, facility.ward, facility.local_government]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Status widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{staff.length}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <UserRound className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-xs text-muted-foreground">Active Clients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{onTrack}</p>
              <p className="text-xs text-muted-foreground">On Track</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle
              className={`h-8 w-8 ${
                defaulters > 0 ? "text-destructive" : "text-muted-foreground"
              }`}
            />
            <div>
              <p className="text-2xl font-bold">{defaulters}</p>
              <p className="text-xs text-muted-foreground">Defaulters</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="staff" className="w-full">
        <TabsList>
          <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
          <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Staff</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No staff assigned to this facility yet.{" "}
                  <Link to="/team" className="text-primary underline">
                    Assign from Team
                  </Link>
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((s) => (
                      <TableRow key={s.user_id}>
                        <TableCell className="font-medium">
                          {[s.first_name, s.last_name].filter(Boolean).join(" ") ||
                            "Unnamed"}
                        </TableCell>
                        <TableCell>
                          {s.role ? (
                            <Badge variant="outline">
                              {roleLabels[s.role] ?? s.role}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No role
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clients (showing up to 50)</CardTitle>
            </CardHeader>
            <CardContent>
              {clients.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No clients registered at this facility yet.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {c.service}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                c.status === "Defaulting"
                                  ? "destructive"
                                  : c.status === "Completed"
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {new Date(c.due_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  No recent activity recorded.
                </p>
              ) : (
                <ul className="space-y-3">
                  {activity.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0"
                    >
                      <Activity className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {log.action} on {log.table_name ?? "system"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
