import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchReminders, Reminder } from "@/queries/reminders";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, Clock, Bot, CheckCircle2, XCircle, RefreshCw, History, Download, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReminderTimelineSheet } from "@/components/reminders/ReminderTimelineSheet";

const ReminderHistory = () => {
  const [selected, setSelected] = useState<Reminder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [facility, setFacility] = useState("all");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const openTimeline = (r: Reminder) => {
    setSelected(r);
    setSheetOpen(true);
  };

  const {
    data: all = [],
    isLoading,
    error,
  } = useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: fetchReminders,
  });

  const facilities = useMemo(() => {
    const map = new Map<string, string>();
    all.forEach((r) => map.set(r.facility_id || "unassigned", r.facility_name || "Unassigned"));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all]);

  const reminders = useMemo(() => {
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return all.filter((r) => {
      if (facility !== "all" && (r.facility_id || "unassigned") !== facility) return false;
      if (status !== "all") {
        const s = r.delivery_status || "queued";
        if (status === "failed" ? !["failed", "undelivered"].includes(s) : s !== status) return false;
      }
      const ts = new Date(r.sent_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }, [all, facility, status, from, to]);

  const filtersActive = facility !== "all" || status !== "all" || !!from || !!to;

  const clearFilters = () => {
    setFacility("all");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  if (error) {
    return (
      <div className="text-destructive p-4">
        Error loading reminders: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reminder History</h1>
          <p className="text-muted-foreground">
            All previously sent AI-generated reminders.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-1.5"
          disabled={reminders.length === 0}
          onClick={() => exportRemindersCsv(reminders)}
        >
          <Download className="h-4 w-4" />
          Export CSV ({reminders.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Facility</Label>
            <Select value={facility} onValueChange={setFacility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All facilities</SelectItem>
                {facilities.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed / Undelivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button
              variant="ghost"
              className="gap-1.5"
              onClick={clearFilters}
              disabled={!filtersActive}
            >
              <X className="h-4 w-4" />
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          title="Total Sent"
          value={isLoading ? null : reminders.length}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="SMS Reminders"
          value={
            isLoading
              ? null
              : reminders.filter((r) => r.reminder_type === "sms").length
          }
          icon={<Phone className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="WhatsApp Reminders"
          value={
            isLoading
              ? null
              : reminders.filter((r) => r.reminder_type === "whatsapp").length
          }
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Automated"
          value={
            isLoading
              ? null
              : reminders.filter((r) => r.reminder_category?.startsWith("automated")).length
          }
          icon={<Bot className="h-4 w-4 text-muted-foreground" />}
        />
        <SummaryCard
          title="Delivered"
          value={
            isLoading
              ? null
              : reminders.filter((r) => r.delivery_status === "delivered").length
          }
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
        />
        <SummaryCard
          title="Failed / Retrying"
          value={
            isLoading
              ? null
              : reminders.filter((r) => ["failed", "undelivered"].includes(r.delivery_status || "")).length
          }
          icon={<XCircle className="h-4 w-4 text-destructive" />}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden lg:table-cell">Facility</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead className="text-right">Timeline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reminders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {filtersActive
                      ? "No reminders match the selected filters."
                      : "No reminders have been sent yet."}
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder) => (
                  <TableRow
                    key={reminder.id}
                    className="cursor-pointer"
                    onClick={() => openTimeline(reminder)}
                  >
                    <TableCell className="font-medium">
                      {reminder.client_name}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {reminder.facility_name}
                    </TableCell>
                    <TableCell>{reminder.client_service}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          reminder.reminder_type === "whatsapp"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {reminder.reminder_type === "whatsapp" ? (
                          <MessageSquare className="h-3 w-3 mr-1" />
                        ) : (
                          <Phone className="h-3 w-3 mr-1" />
                        )}
                        {reminder.reminder_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {reminder.message}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(reminder.sent_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      <DeliveryStatusBadge status={reminder.delivery_status} />
                    </TableCell>
                    <TableCell>
                      {(reminder.retry_count || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <RefreshCw className="h-3 w-3" />
                          {reminder.retry_count}/{reminder.max_retries || 3}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTimeline(reminder);
                        }}
                      >
                        <History className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReminderTimelineSheet
        reminder={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryStatusBadge({ status }: { status?: string }) {
  const s = status || "queued";
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    queued: { variant: "outline", label: "Queued" },
    sent: { variant: "secondary", label: "Sent" },
    delivered: { variant: "default", label: "Delivered" },
    failed: { variant: "destructive", label: "Failed" },
    undelivered: { variant: "destructive", label: "Undelivered" },
  };
  const { variant, label } = config[s] || { variant: "outline" as const, label: s };
  return (
    <Badge variant={variant} className="capitalize">
      {s === "delivered" && <CheckCircle2 className="h-3 w-3 mr-1" />}
      {s === "failed" && <XCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

function exportRemindersCsv(rows: Reminder[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "reminder_id",
    "client",
    "service",
    "facility",
    "channel",
    "category",
    "sent_at",
    "delivery_status",
    "delivery_updated_at",
    "retry_count",
    "max_retries",
    "last_attempted_at",
    "next_retry_at",
    "provider_message_id",
    "error_detail",
    "message",
  ];
  const body = rows.map((r) =>
    [
      r.id,
      r.client_name,
      r.client_service,
      r.facility_name,
      r.reminder_type,
      r.reminder_category,
      new Date(r.sent_at).toISOString(),
      r.delivery_status || "queued",
      r.delivery_updated_at ? new Date(r.delivery_updated_at).toISOString() : "",
      r.retry_count ?? 0,
      r.max_retries ?? 3,
      r.last_attempted_at ? new Date(r.last_attempted_at).toISOString() : "",
      r.next_retry_at ? new Date(r.next_retry_at).toISOString() : "",
      r.external_message_id,
      r.error_detail,
      r.message,
    ].map(esc).join(","),
  );
  const csv = [header.join(","), ...body].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `sms-reminders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default ReminderHistory;
