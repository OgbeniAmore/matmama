
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { patients } from "@/data/patients";
import { Users, Siren, Baby, HeartPulse } from "lucide-react";

const totalPatients = patients.length;
const immunizationDefaulters = patients.filter(p => p.service === "Routine Immunization" && p.status === "Defaulting").length;
const familyPlanningDefaulters = patients.filter(p => p.service === "Family Planning" && p.status === "Defaulting").length;
const ancDefaulters = patients.filter(p => p.service === "Ante Natal Care" && p.status === "Defaulting").length;

const chartData = [
  { name: 'Immunization', OnTrack: patients.filter(p => p.service === "Routine Immunization" && p.status === "On Track").length, Defaulting: patients.filter(p => p.service === "Routine Immunization" && p.status === "Defaulting").length },
  { name: 'Family Planning', OnTrack: patients.filter(p => p.service === "Family Planning" && p.status === "On Track").length, Defaulting: patients.filter(p => p.service === "Family Planning" && p.status === "Defaulting").length },
  { name: 'ANC', OnTrack: patients.filter(p => p.service === "Ante Natal Care" && p.status === "On Track").length, Defaulting: patients.filter(p => p.service === "Ante Natal Care" && p.status === "Defaulting").length },
];


const Dashboard = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a summary of your facility's activities.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Immunization Defaulters</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{immunizationDefaulters}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Planning Defaulters</CardTitle>
            <Siren className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{familyPlanningDefaulters}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ANC Defaulters</CardTitle>
            <HeartPulse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{ancDefaulters}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Services Overview</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
