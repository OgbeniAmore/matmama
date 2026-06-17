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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Phone, Clock, Bot, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const ReminderHistory = () => {
  const {
    data: reminders = [],
    isLoading,
    error,
  } = useQuery<Reminder[]>({
    queryKey: ["reminders"],
    queryFn: fetchReminders,
  });

  if (error) {
    return (
      <div className="text-destructive p-4">
        Error loading reminders: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reminder History</h1>
        <p className="text-muted-foreground">
          All previously sent AI-generated reminders.
        </p>
      </div>

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
                <TableHead>Service</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Retries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reminders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No reminders have been sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell className="font-medium">
                      {reminder.client_name}
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

export default ReminderHistory;
