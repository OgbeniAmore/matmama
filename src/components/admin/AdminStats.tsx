import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  AlertTriangle,
  Building2,
  UsersRound,
  Send,
  ShieldCheck,
} from "lucide-react";

interface AdminStatsProps {
  stats: {
    totalClients: number;
    defaulters: number;
    facilities: number;
    teamMembers: number;
    remindersSent7d: number;
    activeLgas: number;
  } | undefined;
  isLoading: boolean;
}

const statCards = [
  { key: "totalClients", label: "Total Clients", icon: Users, color: "text-primary" },
  { key: "defaulters", label: "Defaulters", icon: AlertTriangle, color: "text-destructive" },
  { key: "facilities", label: "Facilities", icon: Building2, color: "text-primary" },
  { key: "teamMembers", label: "Team Members", icon: UsersRound, color: "text-primary" },
  { key: "remindersSent7d", label: "Reminders (7d)", icon: Send, color: "text-primary" },
  { key: "activeLgas", label: "Active LGAs", icon: ShieldCheck, color: "text-primary" },
] as const;

export function AdminStats({ stats, isLoading }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key];
        return (
          <Card key={card.key}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2.5">
                <Icon className={`h-7 w-7 ${card.color} shrink-0`} />
                <div className="min-w-0">
                  {isLoading ? (
                    <Skeleton className="h-7 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold leading-tight">{value ?? 0}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {card.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
