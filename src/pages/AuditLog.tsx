import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  created_at: string;
  user_id: string | null;
  actor_name: string | null;
  actor_designation: string | null;
}

const fetchAuditLogs = async (): Promise<AuditEntry[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, created_at, user_id, actor_name, actor_designation")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data || [];
};

const fetchProfiles = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name");
  if (error) throw error;
  return data ?? [];
};

const fetchRoles = async () => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role");
  if (error) throw error;
  return data ?? [];
};

const fetchRoster = async () => {
  const { data, error } = await supabase
    .from("facility_roster")
    .select("user_id, name, designation")
    .not("user_id", "is", null);
  if (error) throw error;
  return data ?? [];
};

const fetchAffectedEntities = async () => {
  const [clients, anc, imm] = await Promise.all([
    supabase.from("clients").select("id, name, service"),
    supabase.from("anc_visits").select("id, client_id, visit_name"),
    supabase.from("immunization_records").select("id, client_id, vaccine_name"),
  ]);
  return {
    clients: clients.data ?? [],
    anc: anc.data ?? [],
    imm: imm.data ?? [],
  };
};


const actionVariant = (action: string) => {
  switch (action) {
    case "INSERT": return "default" as const;
    case "UPDATE": return "secondary" as const;
    case "DELETE": return "destructive" as const;
    case "LOGIN": return "outline" as const;
    default: return "outline" as const;
  }
};

const AuditLog = () => {
  const { role } = useAuth();
  // Every authenticated role can view audit logs (RLS scopes to their account; admins see all)
  const canAccess = !!role;

  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("30");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");


  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: fetchAuditLogs,
    enabled: canAccess,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["audit-profiles"],
    queryFn: fetchProfiles,
    enabled: canAccess,
  });

  const { data: rolesData = [] } = useQuery({
    queryKey: ["audit-roles"],
    queryFn: fetchRoles,
    enabled: canAccess,
  });

  const { data: roster = [] } = useQuery({
    queryKey: ["audit-roster"],
    queryFn: fetchRoster,
    enabled: canAccess,
  });

  const { data: entities } = useQuery({
    queryKey: ["audit-entities"],
    queryFn: fetchAffectedEntities,
    enabled: canAccess,
  });


  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    // Roster name takes precedence (more authoritative for facility actions)
    for (const p of profiles) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unnamed";
      m.set(p.user_id, name);
    }
    for (const r of roster) {
      if (r.user_id) m.set(r.user_id, r.name);
    }
    return m;
  }, [profiles, roster]);

  const designationMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of roster) {
      if (r.user_id) m.set(r.user_id, r.designation);
    }
    return m;
  }, [roster]);

  const userRoleMap = useMemo(() => {
    return new Map(rolesData.map((r) => [r.user_id, r.role as string]));
  }, [rolesData]);

  const tables = useMemo(() => {
    return Array.from(
      new Set(logs.map((l) => l.table_name).filter(Boolean) as string[]),
    ).sort();
  }, [logs]);

  // record_id -> human readable "who/what was affected"
  const entityMap = useMemo(() => {
    const m = new Map<string, string>();
    const clientNames = new Map<string, string>();
    for (const c of entities?.clients ?? []) {
      clientNames.set(c.id, c.name);
      m.set(c.id, c.name);
    }
    for (const v of entities?.anc ?? []) {
      m.set(v.id, `${clientNames.get(v.client_id) ?? "Client"} — ${v.visit_name}`);
    }
    for (const r of entities?.imm ?? []) {
      m.set(r.id, `${clientNames.get(r.client_id) ?? "Client"} — ${r.vaccine_name}`);
    }
    return m;
  }, [entities]);

  const affectedLabel = (log: AuditEntry) =>
    (log.record_id && entityMap.get(log.record_id)) || "—";

  const filtered = useMemo(() => {
    const useRange = !!(fromDate || toDate);
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : 0;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity;
    const cutoff =
      useRange || days === "all" ? 0 : Date.now() - parseInt(days) * 24 * 60 * 60 * 1000;
    return logs.filter((l) => {
      const ts = new Date(l.created_at).getTime();
      if (useRange && (ts < from || ts > to)) return false;
      if (cutoff && ts < cutoff) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (tableFilter !== "all" && l.table_name !== tableFilter) return false;
      if (roleFilter !== "all") {
        const r = l.user_id ? userRoleMap.get(l.user_id) : null;
        if (r !== roleFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const userName = l.actor_name ?? (l.user_id ? userMap.get(l.user_id) ?? "" : "");
        const affected = affectedLabel(l);
        if (
          !l.action.toLowerCase().includes(q) &&
          !l.table_name?.toLowerCase().includes(q) &&
          !l.record_id?.toLowerCase().includes(q) &&
          !affected.toLowerCase().includes(q) &&
          !userName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [logs, actionFilter, tableFilter, roleFilter, search, days, fromDate, toDate, userMap, userRoleMap, entityMap]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info("No entries to export");
      return;
    }
    const header = [
      "Date",
      "Time",
      "Action",
      "Table",
      "Affected client / visit",
      "Record ID",
      "Performed by",
      "Designation",
      "Role",
    ];
    const rows = filtered.map((l) => [
      format(new Date(l.created_at), "yyyy-MM-dd"),
      format(new Date(l.created_at), "HH:mm:ss"),
      l.action,
      l.table_name ?? "",
      affectedLabel(l),
      l.record_id ?? "",
      l.actor_name ?? (l.user_id ? userMap.get(l.user_id) ?? l.user_id : "System"),
      l.actor_designation ?? (l.user_id ? designationMap.get(l.user_id) ?? "" : ""),
      l.user_id ? userRoleMap.get(l.user_id) ?? "" : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const rangeLabel =
      fromDate || toDate ? `${fromDate || "start"}_to_${toDate || "now"}` : `last-${days}d`;
    a.href = url;
    a.download = `audit-log-${rangeLabel}-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} entries`);
  };


  if (!canAccess) return <Navigate to="/" replace />;
  if (error) return <div className="text-destructive p-4">Error loading audit logs</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Audit Log</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Track all system actions for accountability and compliance.
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={days} onValueChange={setDays} disabled={!!(fromDate || toDate)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="AUTO_DEFAULTER_DETECTION">Auto-Defaulter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger><SelectValue placeholder="Table" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {tables.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role === "system_admin" && (
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="system_admin">System Admin</SelectItem>
                <SelectItem value="program_manager">Program Manager</SelectItem>
                <SelectItem value="facility_officer">Facility Officer</SelectItem>
                <SelectItem value="data_entry_officer">Data Entry</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="col-span-2 md:col-span-5 flex flex-wrap items-end gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[160px]" />
            </div>
            {(fromDate || toDate) && (
              <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
                Clear range
              </Button>
            )}
          </div>
        </CardContent>
      </Card>


      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {logs.length} entries
      </p>

      {/* Mobile card view */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No entries match your filters.
            </CardContent>
          </Card>
        ) : (
          filtered.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={actionVariant(log.action)} className="text-xs">
                    {log.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
                <p className="text-sm mt-1 capitalize">
                  {log.table_name?.replace(/_/g, " ") || "—"}
                </p>
                {affectedLabel(log) !== "—" && (
                  <p className="text-xs mt-0.5">{affectedLabel(log)}</p>
                )}

                {log.user_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {log.actor_name ?? userMap.get(log.user_id) ?? "Unknown"}
                    {log.actor_designation ? ` (${log.actor_designation})` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Affected client / visit</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Record ID</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No entries match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {log.table_name?.replace(/_/g, " ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-[220px] truncate">
                      {affectedLabel(log)}
                    </TableCell>

                    <TableCell className="text-sm">
                      {log.user_id ? (
                        <div>
                          <p>{log.actor_name ?? userMap.get(log.user_id) ?? "Unknown"}</p>
                          {(log.actor_designation ?? designationMap.get(log.user_id)) && (
                            <p className="text-[10px] text-muted-foreground">
                              {log.actor_designation ?? designationMap.get(log.user_id)}
                            </p>
                          )}
                          {role === "system_admin" && userRoleMap.get(log.user_id) && (
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {userRoleMap.get(log.user_id)?.replace(/_/g, " ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        "System"
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {log.record_id || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;
