import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, ArrowRightLeft, AlertTriangle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Preferences = {
  transfer_in_app: boolean;
  transfer_email: boolean;
  reminder_in_app: boolean;
  reminder_email: boolean;
  defaulter_in_app: boolean;
  defaulter_email: boolean;
};

const defaultPrefs: Preferences = {
  transfer_in_app: true,
  transfer_email: true,
  reminder_in_app: true,
  reminder_email: false,
  defaulter_in_app: true,
  defaulter_email: false,
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Preferences | null;
    },
    enabled: !!user,
  });

  const currentPrefs = prefs || defaultPrefs;

  const mutation = useMutation({
    mutationFn: async (updates: Partial<Preferences>) => {
      const merged = { ...currentPrefs, ...updates };
      if (prefs) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ ...merged, updated_at: new Date().toISOString() })
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({ ...merged, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Preferences updated");
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const toggle = (key: keyof Preferences) => {
    mutation.mutate({ [key]: !currentPrefs[key] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [
    {
      title: "Transfer Requests",
      icon: ArrowRightLeft,
      description: "Notifications when client transfers are submitted, approved, or rejected.",
      inAppKey: "transfer_in_app" as const,
      emailKey: "transfer_email" as const,
    },
    {
      title: "Appointment Reminders",
      icon: Clock,
      description: "Notifications for upcoming client appointments and follow-ups.",
      inAppKey: "reminder_in_app" as const,
      emailKey: "reminder_email" as const,
    },
    {
      title: "Defaulter Alerts",
      icon: AlertTriangle,
      description: "Alerts when clients miss scheduled visits or immunizations.",
      inAppKey: "defaulter_in_app" as const,
      emailKey: "defaulter_email" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Notification Preferences</h1>
        <p className="text-muted-foreground">Choose which notifications you receive and how.</p>
      </div>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <section.icon className="h-4 w-4" />
                {section.title}
              </CardTitle>
              <CardDescription className="text-sm">{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={section.inAppKey}>In-app notifications</Label>
                </div>
                <Switch
                  id={section.inAppKey}
                  checked={currentPrefs[section.inAppKey]}
                  onCheckedChange={() => toggle(section.inAppKey)}
                  disabled={mutation.isPending}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={section.emailKey}>Email notifications</Label>
                </div>
                <Switch
                  id={section.emailKey}
                  checked={currentPrefs[section.emailKey]}
                  onCheckedChange={() => toggle(section.emailKey)}
                  disabled={mutation.isPending}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
