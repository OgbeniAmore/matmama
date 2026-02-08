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
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

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
    .limit(200);

  if (error) throw error;
  return data || [];
};

const actionVariant = (action: string) => {
  switch (action) {
    case "INSERT": return "default" as const;
    case "UPDATE": return "secondary" as const;
    case "DELETE": return "destructive" as const;
    default: return "outline" as const;
  }
};

const AuditLog = () => {
  const { role } = useAuth();

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: fetchAuditLogs,
    enabled: role === "program_manager" || role === "system_admin",
  });

  if (role !== "program_manager" && role !== "system_admin") {
    return <Navigate to="/" replace />;
  }

  if (error) {
    return <div className="text-destructive p-4">Error loading audit logs</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Audit Log</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Track all system actions for accountability and compliance.
        </p>
      </div>

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
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No audit entries yet.
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => (
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
                {log.record_id && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {log.record_id}
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
                <TableHead>Record ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    No audit entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
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
