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
}

const fetchAuditLogs = async (): Promise<AuditEntry[]> => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, created_at, user_id")
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

const actionVariant = (action: string) => {
  switch (action) {
    case "INSERT": return "default" as const;
    case "UPDATE": return "secondary" as const;
    case "DELETE": return "destructive" as const;
    case "LOGIN": return "outline" as const;
    default: return "outline" as const;
  }
};
    case "UPDATE": return "secondary" as const;
    case "DELETE": return "destructive" as const;
    case "LOGIN": return "outline" as const;
    default: return "outline" as const;
  }
};

const AuditLog = () => {
  const { role } = useAuth();
  const canAccess = role === "program_manager" || role === "system_admin";

  const [actionFilter, setActionFilter] = useState("all");
  const [tableFilter, setTableFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [days, setDays] = useState("30");

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

  const userMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unnamed";
      m.set(p.user_id, name);
    }
    return m;
  }, [profiles]);

  const userRoleMap = useMemo(() => {
    return new Map(rolesData.map((r) => [r.user_id, r.role as string]));
  }, [rolesData]);

  const tables = useMemo(() => {
    return Array.from(
      new Set(logs.map((l) => l.table_name).filter(Boolean) as string[]),
    ).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const cutoff =
      days === "all" ? 0 : Date.now() - parseInt(days) * 24 * 60 * 60 * 1000;
    return logs.filter((l) => {
      if (cutoff && new Date(l.created_at).getTime() < cutoff) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (tableFilter !== "all" && l.table_name !== tableFilter) return false;
      if (roleFilter !== "all") {
        const r = l.user_id ? userRoleMap.get(l.user_id) : null;
        if (r !== roleFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const userName = l.user_id ? userMap.get(l.user_id) ?? "" : "";
        if (
          !l.action.toLowerCase().includes(q) &&
          !l.table_name?.toLowerCase().includes(q) &&
          !l.record_id?.toLowerCase().includes(q) &&
          !userName.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [logs, actionFilter, tableFilter, roleFilter, search, days, userMap, userRoleMap]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info("No entries to export");
      return;
    }
    const header = ["Timestamp", "Action", "Table", "Record ID", "User", "Role"];
    const rows = filtered.map((l) => [
      new Date(l.created_at).toISOString(),
      l.action,
      l.table_name ?? "",
      l.record_id ?? "",
      l.user_id ? userMap.get(l.user_id) ?? l.user_id : "",
      l.user_id ? userRoleMap.get(l.user_id) ?? "" : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
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
          <Select value={days} onValueChange={setDays}>
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
                {log.user_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {userMap.get(log.user_id) ?? "Unknown"}
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
                <TableHead>User</TableHead>
                <TableHead>Record ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                    <TableCell className="text-sm">
                      {log.user_id ? (
                        <div>
                          <p>{userMap.get(log.user_id) ?? "Unknown"}</p>
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
