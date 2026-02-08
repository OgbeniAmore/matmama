import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Baby, HeartPulse, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data.map((p) => ({
    ...p,
    service: p.service as Client["service"],
    status: p.status as Client["status"],
    dueDate: new Date(p.due_date),
    assignedTo: p.assigned_to,
    childDob: p.child_dob ? new Date(p.child_dob) : undefined,
    childName: p.child_name || undefined,
    edd: p.edd ? new Date(p.edd) : undefined,
  }));
};

function StatusCard({
  title,
  count,
  isLoading,
  icon,
  className,
}: {
  title: string;
  count: number;
  isLoading: boolean;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium sm:text-sm">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <div className="text-xl font-bold sm:text-2xl">{count}</div>
        )}
      </CardContent>
    </Card>
  );
}

const Dashboard = () => {
  const { profile, role } = useAuth();
  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  if (error) {
    return <div className="text-destructive p-4">Error loading dashboard: {error.message}</div>;
  }

  const totalClients = clients.length;
  const onTrack = clients.filter(p => p.status === "On Track");
  const defaulting = clients.filter(p => p.status === "Defaulting");
  const completed = clients.filter(p => p.status === "Completed");
  const overdue = defaulting.filter(p => p.dueDate < new Date());

  const servicesData = [
    {
      name: "Routine Immunization",
      icon: Baby,
      onTrack: clients.filter(p => p.service === "Routine Immunization" && p.status === "On Track").length,
      defaulting: clients.filter(p => p.service === "Routine Immunization" && p.status === "Defaulting").length,
      completed: clients.filter(p => p.service === "Routine Immunization" && p.status === "Completed").length,
    },
    {
      name: "Family Planning",
      icon: Users,
      onTrack: clients.filter(p => p.service === "Family Planning" && p.status === "On Track").length,
      defaulting: clients.filter(p => p.service === "Family Planning" && p.status === "Defaulting").length,
      completed: clients.filter(p => p.service === "Family Planning" && p.status === "Completed").length,
    },
    {
      name: "Ante Natal Care",
      icon: HeartPulse,
      onTrack: clients.filter(p => p.service === "Ante Natal Care" && p.status === "On Track").length,
      defaulting: clients.filter(p => p.service === "Ante Natal Care" && p.status === "Defaulting").length,
      completed: clients.filter(p => p.service === "Ante Natal Care" && p.status === "Completed").length,
    },
  ].map(s => ({ ...s, total: s.onTrack + s.defaulting + s.completed }));

  const greeting = profile?.first_name ? `Welcome, ${profile.first_name}!` : 'Welcome back!';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{greeting}</h1>
        <p className="text-muted-foreground text-sm md:text-base">
          {role === 'program_manager'
            ? 'Program overview across all facilities'
            : "Your facility's activity summary"}
        </p>
      </div>

      {/* Summary cards - 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatusCard
          title="Total Clients"
          count={totalClients}
          isLoading={isLoading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <StatusCard
          title="On Track"
          count={onTrack.length}
          isLoading={isLoading}
          icon={<CheckCircle className="h-4 w-4 text-status-ontrack" />}
          className="border-l-4 border-l-status-ontrack"
        />
        <StatusCard
          title="Defaulting"
          count={defaulting.length}
          isLoading={isLoading}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          className="border-l-4 border-l-destructive"
        />
        <StatusCard
          title="Completed"
          count={completed.length}
          isLoading={isLoading}
          icon={<Clock className="h-4 w-4 text-status-completed" />}
          className="border-l-4 border-l-status-completed"
        />
      </div>

      {/* Overdue alerts */}
      {!isLoading && overdue.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2 md:text-base">
              <AlertTriangle className="h-4 w-4" />
              {overdue.length} Overdue Client{overdue.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.slice(0, 5).map(client => (
                <div key={client.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="font-medium truncate">{client.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      Due {format(client.dueDate, "MMM d")}
                    </span>
                    <Badge variant="destructive" className="text-[10px]">{client.service}</Badge>
                  </div>
                </div>
              ))}
              {overdue.length > 5 && (
                <p className="text-xs text-muted-foreground pt-1">
                  +{overdue.length - 5} more overdue
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Services Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-2">
                    <Skeleton className="h-6 w-6 rounded-sm" />
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </div>
                  <div className="pl-9 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {servicesData.map((service) => (
                <div key={service.name}>
                  <div className="flex items-center gap-3 mb-2">
                    <service.icon className="h-5 w-5 text-primary md:h-6 md:w-6" />
                    <h3 className="font-semibold text-sm md:text-base">{service.name}</h3>
                    <span className="text-xs text-muted-foreground ml-auto md:text-sm">
                      {service.total} clients
                    </span>
                  </div>
                  <div className="pl-8 space-y-1.5 text-sm md:pl-9">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-status-ontrack" />
                        <span>On Track</span>
                      </div>
                      <span className="font-medium">{service.onTrack}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                        <span>Defaulting</span>
                      </div>
                      <span className="font-medium text-destructive">{service.defaulting}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-status-completed" />
                        <span>Completed</span>
                      </div>
                      <span className="font-medium">{service.completed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
