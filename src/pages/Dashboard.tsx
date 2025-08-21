import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, MessageSquare, AlertTriangle, Activity, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { ReminderStats, Appointment } from '@/types/api';
import { toast } from 'sonner';

export default function Dashboard() {
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [defaulters, setDefaulters] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, defaultersResponse] = await Promise.all([
        api.getReminderStats(),
        api.getDefaulters()
      ]);
      
      setStats(statsResponse.stats);
      setDefaulters(defaultersResponse.defaulters);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const triggerReminderCheck = async () => {
    try {
      await api.triggerReminderCheck();
      toast.success('Reminder check triggered successfully');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to trigger reminder check:', error);
      toast.error('Failed to trigger reminder check');
    }
  };

  const getAppointmentTypeColor = (type: string) => {
    switch (type) {
      case 'immunization': return 'bg-blue-100 text-blue-800';
      case 'anc': return 'bg-pink-100 text-pink-800';
      case 'family_planning': return 'bg-green-100 text-green-800';
      case 'tuberculosis': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAppointmentType = (type: string) => {
    switch (type) {
      case 'immunization': return 'Immunization';
      case 'anc': return 'ANC';
      case 'family_planning': return 'Family Planning';
      case 'tuberculosis': return 'TB Care';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Healthcare Reminder Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage patient reminders for immunization, ANC, family planning, and TB care</p>
        </div>
        <Button onClick={triggerReminderCheck} className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Trigger Reminder Check
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reminders</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successfully Sent</CardTitle>
            <Phone className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.total ? Math.round((stats.sent / stats.total) * 100) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Defaulters</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{defaulters.length}</div>
            <p className="text-xs text-muted-foreground">Missed appointments</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="defaulters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="defaulters">Defaulters</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="defaulters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Patients with Missed Appointments
              </CardTitle>
              <CardDescription>
                Patients who have missed their scheduled appointments and may need follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {defaulters.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No defaulters found. All patients are up to date!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {defaulters.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">{appointment.patients?.name}</h3>
                          <Badge className={getAppointmentTypeColor(appointment.appointment_type)}>
                            {formatAppointmentType(appointment.appointment_type)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <p>Phone: {appointment.patients?.phone}</p>
                          <p>Scheduled: {new Date(appointment.scheduled_date).toLocaleDateString()}</p>
                          <p>Preferred Contact: {appointment.patients?.preferred_contact_method}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => api.markAppointmentMissed(appointment.id)}
                        >
                          Mark Missed
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => api.markAppointmentCompleted(appointment.id)}
                        >
                          Mark Completed
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reminder Methods</CardTitle>
                <CardDescription>Distribution of SMS vs WhatsApp reminders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SMS</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: stats?.total ? `${(stats.sms / stats.total) * 100}%` : '0%' }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground">{stats?.sms || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">WhatsApp</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: stats?.total ? `${(stats.whatsapp / stats.total) * 100}%` : '0%' }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground">{stats?.whatsapp || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
                <CardDescription>Overall reminder delivery success</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {stats?.total ? Math.round((stats.sent / stats.total) * 100) : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats?.sent || 0} out of {stats?.total || 0} reminders sent successfully
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}