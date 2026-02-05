
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Baby, HeartPulse } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const fetchClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clients:", error);
    throw new Error(error.message);
  }

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

const Dashboard = () => {
  const {
    data: clients = [],
    isLoading,
    error,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  if (error) {
    return <div className="text-red-500 p-4">Error loading dashboard data: {error.message}</div>;
  }

  const totalClients = clients.length;
  const immunizationDefaulters = clients.filter(p => p.service === "Routine Immunization" && p.status === "Defaulting").length;
  const familyPlanningDefaulters = clients.filter(p => p.service === "Family Planning" && p.status === "Defaulting").length;
  const ancDefaulters = clients.filter(p => p.service === "Ante Natal Care" && p.status === "Defaulting").length;

  const servicesData = [
    {
      name: "Routine Immunization",
      icon: Baby,
      onTrack: clients.filter(p => p.service === "Routine Immunization" && p.status === "On Track").length,
      defaulting: immunizationDefaulters,
      completed: clients.filter(p => p.service === "Routine Immunization" && p.status === "Completed").length,
    },
    {
      name: "Family Planning",
      icon: Users,
      onTrack: clients.filter(p => p.service === "Family Planning" && p.status === "On Track").length,
      defaulting: familyPlanningDefaulters,
      completed: clients.filter(p => p.service === "Family Planning" && p.status === "Completed").length,
    },
    {
      name: "Ante Natal Care",
      icon: HeartPulse,
      onTrack: clients.filter(p => p.service === "Ante Natal Care" && p.status === "On Track").length,
      defaulting: ancDefaulters,
      completed: clients.filter(p => p.service === "Ante Natal Care" && p.status === "Completed").length,
    },
  ].map(service => ({ ...service, total: service.onTrack + service.defaulting + service.completed }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a summary of your facility's activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{totalClients}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Immunization Defaulters</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{immunizationDefaulters}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Planning Defaulters</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{familyPlanningDefaulters}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ANC Defaulters</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{ancDefaulters}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Services Overview</CardTitle>
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
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-8" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-8" />
                            </div>
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-8" />
                            </div>
                        </div>
                    </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {servicesData.map((service) => (
                  <div key={service.name}>
                    <div className="flex items-center gap-3 mb-2">
                      <service.icon className="h-6 w-6 text-primary" />
                      <h3 className="font-semibold text-base">{service.name}</h3>
                      <span className="text-sm text-muted-foreground ml-auto">{service.total} clients</span>
                    </div>
                    <div className="pl-9 space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span>On Track</span>
                        </div>
                        <span className="font-medium">{service.onTrack}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span>Defaulting</span>
                        </div>
                        <span className="font-medium text-destructive">{service.defaulting}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
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
