import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Calendar, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Patient, Appointment } from '@/types/api';
import { toast } from 'sonner';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_type: 'immunization' as 'immunization' | 'anc' | 'family_planning' | 'tuberculosis',
    scheduled_date: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appointmentsResponse, patientsResponse] = await Promise.all([
        api.getAppointments({
          ...(filterStatus !== 'all' && { status: filterStatus }),
          ...(filterType !== 'all' && { appointment_type: filterType })
        }),
        api.getPatients()
      ]);
      
      setAppointments(appointmentsResponse.appointments);
      setPatients(patientsResponse.patients);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAppointment) {
        await api.updateAppointment(editingAppointment.id, formData);
        toast.success('Appointment updated successfully');
      } else {
        await api.createAppointment(formData);
        toast.success('Appointment created successfully');
      }
      
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Failed to save appointment:', error);
      toast.error(error.message || 'Failed to save appointment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      await api.deleteAppointment(id);
      toast.success('Appointment deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const markCompleted = async (id: string) => {
    try {
      await api.markAppointmentCompleted(id);
      toast.success('Appointment marked as completed');
      loadData();
    } catch (error) {
      console.error('Failed to mark appointment as completed:', error);
      toast.error('Failed to mark appointment as completed');
    }
  };

  const markMissed = async (id: string) => {
    try {
      await api.markAppointmentMissed(id);
      toast.success('Appointment marked as missed');
      loadData();
    } catch (error) {
      console.error('Failed to mark appointment as missed:', error);
      toast.error('Failed to mark appointment as missed');
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      appointment_type: 'immunization',
      scheduled_date: '',
      notes: ''
    });
    setEditingAppointment(null);
    setIsCreateDialogOpen(false);
  };

  const startEdit = (appointment: Appointment) => {
    setFormData({
      patient_id: appointment.patient_id,
      appointment_type: appointment.appointment_type,
      scheduled_date: appointment.scheduled_date,
      notes: appointment.notes || ''
    });
    setEditingAppointment(appointment);
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge variant="outline" className="bg-blue-50">Scheduled</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-50">Completed</Badge>;
      case 'missed': return <Badge variant="outline" className="bg-red-50">Missed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-gray-50">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAppointmentTypeBadge = (type: string) => {
    switch (type) {
      case 'immunization': return <Badge className="bg-blue-100 text-blue-800">Immunization</Badge>;
      case 'anc': return <Badge className="bg-pink-100 text-pink-800">ANC</Badge>;
      case 'family_planning': return <Badge className="bg-green-100 text-green-800">Family Planning</Badge>;
      case 'tuberculosis': return <Badge className="bg-red-100 text-red-800">TB Care</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Appointment Management</h1>
          <p className="text-muted-foreground">Schedule and manage patient appointments</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}</DialogTitle>
              <DialogDescription>
                {editingAppointment ? 'Update appointment details' : 'Schedule a new appointment for a patient'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="patient">Patient</Label>
                <Select 
                  value={formData.patient_id} 
                  onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} - {patient.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="appointment-type">Appointment Type</Label>
                <Select 
                  value={formData.appointment_type} 
                  onValueChange={(value: 'immunization' | 'anc' | 'family_planning' | 'tuberculosis') => 
                    setFormData({ ...formData, appointment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immunization">Immunization</SelectItem>
                    <SelectItem value="anc">Antenatal Care (ANC)</SelectItem>
                    <SelectItem value="family_planning">Family Planning</SelectItem>
                    <SelectItem value="tuberculosis">Tuberculosis Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date">Scheduled Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the appointment"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingAppointment ? 'Update Appointment' : 'Schedule Appointment'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="immunization">Immunization</SelectItem>
            <SelectItem value="anc">ANC</SelectItem>
            <SelectItem value="family_planning">Family Planning</SelectItem>
            <SelectItem value="tuberculosis">TB Care</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointments ({appointments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No appointments found
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p>{appointment.patients?.name}</p>
                          <p className="text-sm text-muted-foreground">{appointment.patients?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getAppointmentTypeBadge(appointment.appointment_type)}</TableCell>
                      <TableCell>{new Date(appointment.scheduled_date).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">{appointment.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {appointment.status === 'scheduled' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markCompleted(appointment.id)}
                                title="Mark as completed"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markMissed(appointment.id)}
                                title="Mark as missed"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(appointment)}
                            title="Edit appointment"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(appointment.id)}
                            title="Delete appointment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}