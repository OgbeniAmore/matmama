import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Reminder } from "@/queries/reminders";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActiveWorker } from "@/contexts/ActiveWorkerContext";
import {
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Timer,
  Download,
} from "lucide-react";

interface Props {
  reminder: Reminder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TimelineEvent {
  label: string;
  at?: string | null;
  detail?: string | null;
  tone: "neutral" | "success" | "error" | "warn";
  icon: React.ReactNode;
}

const fmt = (v?: string | null) =>
  v ? format(new Date(v), "MMM d, yyyy h:mm:ss a") : "—";

export function ReminderTimelineSheet({ reminder, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { worker, requireWorker } = useActiveWorker();
  const queryClient = useQueryClient();
  const [cooldown, setCooldown] = useState(0);

  const failed = ["failed", "undelivered"].includes(reminder?.delivery_status || "");
  const retries = reminder?.retry_count ?? 0;
  const maxRetries = reminder?.max_retries ?? 3;
  const exhausted = retries >= maxRetries;

  const resend = useMutation({
    mutationFn: async () => {
      if (!reminder) return;
      const actor = worker ?? (await requireWorker());
      if (!actor) throw new Error("Health worker identification is required to resend.");
      const { data, error } = await supabase.functions.invoke("send-ai-reminder", {
        body: {
          retryOf: reminder.id,
          actorName: actor.name,
          actorDesignation: actor.designation,
        },
      });
      if (error) {
        // Surface structured errors (429 cooldown / rate limit) from the function
        const ctx = (error as any).context;
        let payload: any = null;
        try {
          payload = await ctx?.json?.();
        } catch {
          /* ignore */
        }
        if (payload?.retryAfterSeconds) {
          setCooldown(payload.retryAfterSeconds);
          const t = setInterval(
            () =>
              setCooldown((c) => {
                if (c <= 1) {
                  clearInterval(t);
                  return 0;
                }
                return c - 1;
              }),
            1000,
          );
        }
        throw new Error(payload?.error || error.message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "SMS resent", description: "The reminder has been queued for delivery." });
      setCooldown(300);
      const t = setInterval(
        () =>
          setCooldown((c) => {
            if (c <= 1) {
              clearInterval(t);
              return 0;
            }
            return c - 1;
          }),
        1000,
      );
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["sms-delivery-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (e: Error) => {
      toast({ title: "Resend failed", description: e.message, variant: "destructive" });
    },
  });

  if (!reminder) return null;

  const events: TimelineEvent[] = [
    {
      label: "Reminder created",
      at: reminder.created_at,
      detail: reminder.reminder_category
        ? `Category: ${reminder.reminder_category}`
        : null,
      tone: "neutral",
      icon: <Clock className="h-4 w-4" />,
    },
    {
      label: "Dispatched to provider",
      at: reminder.sent_at,
      detail: reminder.external_message_id
        ? `Message ID: ${reminder.external_message_id}`
        : "No provider message ID recorded",
      tone: "neutral",
      icon: <Send className="h-4 w-4" />,
    },
  ];

  if (retries > 0) {
    events.push({
      label: `Retry attempts: ${retries} of ${maxRetries}`,
      at: reminder.last_attempted_at,
      detail: reminder.next_retry_at
        ? `Next retry scheduled ${fmt(reminder.next_retry_at)}`
        : exhausted
          ? "Retry budget exhausted"
          : null,
      tone: "warn",
      icon: <RefreshCw className="h-4 w-4" />,
    });
  }

  if (reminder.delivery_status === "delivered") {
    events.push({
      label: "Delivered to handset",
      at: reminder.delivery_updated_at,
      tone: "success",
      icon: <CheckCircle2 className="h-4 w-4" />,
    });
  } else if (failed) {
    events.push({
      label:
        reminder.delivery_status === "undelivered"
          ? "Undelivered by carrier"
          : "Delivery failed",
      at: reminder.delivery_updated_at,
      detail: reminder.error_detail || "No reason reported by provider",
      tone: "error",
      icon: <XCircle className="h-4 w-4" />,
    });
  } else {
    events.push({
      label: "Awaiting delivery receipt",
      at: reminder.delivery_updated_at,
      detail: "Provider has not reported a final status yet",
      tone: "warn",
      icon: <Timer className="h-4 w-4" />,
    });
  }

  const toneClass = {
    neutral: "text-muted-foreground border-border",
    success: "text-primary border-primary",
    error: "text-destructive border-destructive",
    warn: "text-muted-foreground border-muted-foreground",
  } as const;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Delivery timeline</SheetTitle>
          <SheetDescription>
            {reminder.client_name} · {reminder.client_service} ·{" "}
            <span className="capitalize">{reminder.reminder_type}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportTimelineCsv(reminder, events)}>
              <Download className="h-4 w-4" />
              Export timeline CSV
            </Button>
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-1">Message</p>
            <p className="text-sm">{reminder.message}</p>
          </div>

          <div className="space-y-0">
            {events.map((e, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background ${toneClass[e.tone]}`}
                  >
                    {e.icon}
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="pb-6 pt-1">
                  <p className="text-sm font-medium">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{fmt(e.at)}</p>
                  {e.detail && (
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      {e.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              Status: {reminder.delivery_status || "queued"}
            </Badge>
            <Badge variant="outline">
              Retries: {retries}/{maxRetries}
            </Badge>
          </div>

          {failed && (
            <div className="space-y-2 rounded-md border border-destructive/40 p-3">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                This reminder was not delivered
              </p>
              <p className="text-xs text-muted-foreground">
                Manual resends are limited to one every 5 minutes per reminder, and 20 per
                hour across your facility.{exhausted ? " Automatic retries are exhausted, but you can still resend manually." : ""}
              </p>
              <Button
                size="sm"
                onClick={() => resend.mutate()}
                disabled={resend.isPending || cooldown > 0}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`h-4 w-4 ${resend.isPending ? "animate-spin" : ""}`}
                />
                {cooldown > 0
                  ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                  : "Resend SMS"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function exportTimelineCsv(reminder: Reminder, events: TimelineEvent[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "reminder_id",
    "client",
    "service",
    "facility",
    "channel",
    "category",
    "event",
    "event_at",
    "detail",
    "delivery_status",
    "retry_count",
    "max_retries",
    "provider_message_id",
    "message",
  ];
  const rows = events.map((e) =>
    [
      reminder.id,
      reminder.client_name,
      reminder.client_service,
      reminder.facility_name,
      reminder.reminder_type,
      reminder.reminder_category,
      e.label,
      e.at ? new Date(e.at).toISOString() : "",
      e.detail,
      reminder.delivery_status,
      reminder.retry_count ?? 0,
      reminder.max_retries ?? 3,
      reminder.external_message_id,
      reminder.message,
    ].map(esc).join(","),
  );
  const csv = [header.join(","), ...rows].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reminder-timeline-${reminder.id.slice(0, 8)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
