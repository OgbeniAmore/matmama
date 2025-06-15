
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, Siren, Baby, HeartPulse } from "lucide-react";
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

  const chartData = [
    { name: 'Immunization', OnTrack: clients.filter(p => p.service === "Routine Immunization" && p.status === "On Track").length, Defaulting: clients.filter(p => p.service === "Routine Immunization" && p.status === "Defaulting").length },
    { name: 'Family Planning', OnTrack: clients.filter(p => p.service === "Family Planning" && p.status === "On Track").length, Defaulting: clients.filter(p => p.service === "Family Planning" && p.status === "Defaulting").length },
    { name: 'ANC', OnTrack: clients.filter(p => p.service === "Ante Natal Care" && p.status === "On Track").length, Defaulting: clients.filter(p => p.service === "Ante Natal Care" && p.status === "Defaulting").length },
  ];

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
            <Siren className="h-4 w-4 text-muted-foreground" />
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
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="OnTrack" fill="hsl(var(--primary))" />
                      <Bar dataKey="Defaulting" fill="hsl(var(--destructive))" />
                  </BarChart>
              </ResponsiveContainer>
            )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
