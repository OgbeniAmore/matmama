import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SERVICES = ["Routine Immunization", "Family Planning", "Ante Natal Care"] as const;
const CATEGORIES = [
  { key: "upcoming", label: "Upcoming visit (T-3 days)", help: "Sent automatically 3 days before a scheduled visit." },
  { key: "day_of", label: "Day of visit", help: "Sent automatically on the day of the scheduled visit." },
  { key: "follow_up", label: "Day after visit", help: "Sent automatically the day after the scheduled visit." },
  { key: "defaulter", label: "Defaulter follow-up", help: "Sent when a client has missed a visit by 3+ days." },
  { key: "manual", label: "Manual reminder", help: "Used when staff send a reminder by hand." },
] as const;

const PLACEHOLDERS = ["{name}", "{service}", "{due_date}", "{child_name}", "{trimester}", "{facility}"];

const DEFAULTS: Record<string, string> = {
  "Routine Immunization|upcoming":
    "Hi {name}, this is a friendly reminder that {child_name}'s immunization is due on {due_date}. Please visit {facility}.",
  "Routine Immunization|day_of":
    "Hi {name}, today is {child_name}'s immunization day at {facility}. Please come in. Thank you.",
  "Routine Immunization|follow_up":
    "Hi {name}, we missed you yesterday for {child_name}'s immunization. Please visit {facility} today if possible.",
  "Routine Immunization|defaulter":
    "Hi {name}, {child_name} missed their immunization on {due_date}. Please visit {facility} as soon as possible.",
  "Routine Immunization|manual":
    "Hi {name}, please bring {child_name} for their immunization at {facility}. Thank you.",
  "Family Planning|upcoming":
    "Hi {name}, your family planning appointment is on {due_date} at {facility}. We look forward to seeing you.",
  "Family Planning|day_of":
    "Hi {name}, today is your family planning appointment at {facility}. See you soon.",
  "Family Planning|follow_up":
    "Hi {name}, we missed you yesterday for your family planning visit. Please come to {facility} today.",
  "Family Planning|defaulter":
    "Hi {name}, you missed your family planning visit on {due_date}. Please reschedule with {facility} soon.",
  "Family Planning|manual":
    "Hi {name}, this is a reminder for your family planning visit at {facility}.",
  "Ante Natal Care|upcoming":
    "Hi {name}, your antenatal visit (trimester {trimester}) is on {due_date} at {facility}. Stay safe.",
  "Ante Natal Care|day_of":
    "Hi {name}, today is your antenatal visit at {facility}. Please come in. Stay safe.",
  "Ante Natal Care|follow_up":
    "Hi {name}, we missed you yesterday at {facility} for your antenatal visit. Please come in today.",
  "Ante Natal Care|defaulter":
    "Hi {name}, you missed your antenatal visit on {due_date}. Please come to {facility} as soon as possible.",
  "Ante Natal Care|manual":
    "Hi {name}, please attend your antenatal visit at {facility}. Take care.",
};

type Row = {
  id?: string;
  service: string;
  category: string;
  body: string;
  enabled: boolean;
};

export default function SmsTemplates() {
  const { accountId, role, user } = useAuth();
  const qc = useQueryClient();
  const canEdit = role === "program_manager" || role === "system_admin";

  const { data, isLoading } = useQuery({
    queryKey: ["sms-templates", accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sms_templates")
        .select("*")
        .eq("account_id", accountId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!accountId,
  });

  const [rows, setRows] = useState<Record<string, Row>>({});

  useEffect(() => {
    const next: Record<string, Row> = {};
    for (const s of SERVICES) {
      for (const c of CATEGORIES) {
        const key = `${s}|${c.key}`;
        const existing = data?.find((r: any) => r.service === s && r.category === c.key);
        next[key] = existing
          ? { id: existing.id, service: s, category: c.key, body: existing.body, enabled: existing.enabled }
          : { service: s, category: c.key, body: DEFAULTS[key] || "", enabled: true };
      }
    }
    setRows(next);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async (row: Row) => {
      const payload: any = {
        account_id: accountId,
        service: row.service,
        category: row.category,
        body: row.body,
        enabled: row.enabled,
        updated_by: user?.id,
      };
      if (row.id) {
        const { error } = await supabase
          .from("sms_templates")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sms_templates")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Template saved" });
      qc.invalidateQueries({ queryKey: ["sms-templates", accountId] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const grouped = useMemo(() => SERVICES.map((s) => ({ service: s, items: CATEGORIES })), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">SMS Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the message text used for reminders. Disabled templates fall back to AI-generated messages.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <Badge key={p} variant="secondary" className="font-mono text-[11px]">{p}</Badge>
          ))}
        </div>
      </div>

      {!canEdit && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You can view templates but only Program Managers and System Admins can edit them.
          </CardContent>
        </Card>
      )}

      {grouped.map((g) => (
        <Card key={g.service}>
          <CardHeader>
            <CardTitle>{g.service}</CardTitle>
            <CardDescription>Customize SMS messages for this service.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {g.items.map((c) => {
              const key = `${g.service}|${c.key}`;
              const row = rows[key];
              if (!row) return null;
              return (
                <div key={key} className="space-y-2 border-l-2 pl-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="font-medium">{c.label}</Label>
                      <p className="text-xs text-muted-foreground">{c.help}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`en-${key}`} className="text-xs text-muted-foreground">Enabled</Label>
                      <Switch
                        id={`en-${key}`}
                        checked={row.enabled}
                        disabled={!canEdit}
                        onCheckedChange={(v) => setRows((r) => ({ ...r, [key]: { ...r[key], enabled: v } }))}
                      />
                    </div>
                  </div>
                  <Textarea
                    rows={3}
                    value={row.body}
                    disabled={!canEdit}
                    onChange={(e) => setRows((r) => ({ ...r, [key]: { ...r[key], body: e.target.value } }))}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{row.body.length} chars</span>
                    {canEdit && (
                      <Button
                        size="sm"
                        onClick={() => saveMut.mutate(row)}
                        disabled={saveMut.isPending || !row.body.trim()}
                      >
                        Save
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
