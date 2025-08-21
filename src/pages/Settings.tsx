import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { ReminderTemplate } from '@/types/api';
import { toast } from 'sonner';

export default function Settings() {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);

  const [formData, setFormData] = useState({
    appointment_type: 'immunization' as 'immunization' | 'anc' | 'family_planning' | 'tuberculosis',
    template_name: '',
    message_template: '',
    days_before_appointment: 3,
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.getReminderTemplates();
      setTemplates(response.templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load reminder templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.updateReminderTemplate(editingTemplate.id, formData);
        toast.success('Template updated successfully');
      } else {
        await api.createReminderTemplate(formData);
        toast.success('Template created successfully');
      }
      
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error('Failed to save template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await api.deleteReminderTemplate(id);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const resetForm = () => {
    setFormData({
      appointment_type: 'immunization',
      template_name: '',
      message_template: '',
      days_before_appointment: 3,
      is_active: true
    });
    setEditingTemplate(null);
    setIsCreateDialogOpen(false);
  };

  const startEdit = (template: ReminderTemplate) => {
    setFormData({
      appointment_type: template.appointment_type,
      template_name: template.template_name,
      message_template: template.message_template,
      days_before_appointment: template.days_before_appointment,
      is_active: template.is_active
    });
    setEditingTemplate(template);
    setIsCreateDialogOpen(true);
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

  const defaultTemplate = `Hello {{patient_name}}, this is a reminder that you have a {{appointment_type}} appointment scheduled for {{appointment_date}}. Please visit our clinic at the scheduled time. For any questions, call {{clinic_phone}}.

Available variables:
- {{patient_name}}: Patient's full name
- {{appointment_date}}: Appointment date
- {{appointment_type}}: Type of appointment
- {{clinic_name}}: Clinic name
- {{clinic_address}}: Clinic address
- {{clinic_phone}}: Clinic phone number`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure reminder templates and system preferences</p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Reminder Templates</TabsTrigger>
          <TabsTrigger value="system">System Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Reminder Templates</h2>
              <p className="text-sm text-muted-foreground">Manage message templates for different appointment types</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                  <DialogDescription>
                    {editingTemplate ? 'Update the reminder template' : 'Create a new reminder message template'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="days-before">Days Before Appointment</Label>
                      <Input
                        id="days-before"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.days_before_appointment}
                        onChange={(e) => setFormData({ ...formData, days_before_appointment: parseInt(e.target.value) || 3 })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={formData.template_name}
                      onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                      placeholder="e.g., Standard Immunization Reminder"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message-template">Message Template</Label>
                    <Textarea
                      id="message-template"
                      value={formData.message_template}
                      onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                      placeholder={defaultTemplate}
                      rows={8}
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use variables like {{`{patient_name}`}} and {{`{appointment_date}`}} in your message
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is-active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is-active">Active Template</Label>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingTemplate ? 'Update Template' : 'Create Template'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message Templates ({templates.length})
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
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Days Before</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No templates found
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.template_name}</TableCell>
                          <TableCell>{getAppointmentTypeBadge(template.appointment_type)}</TableCell>
                          <TableCell>{template.days_before_appointment} days</TableCell>
                          <TableCell>
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={template.message_template}>
                            {template.message_template.slice(0, 100)}...
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(template.id)}
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
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Configure system-wide settings for the reminder service
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Twilio Configuration</CardTitle>
                    <CardDescription>Configure WhatsApp and SMS settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Account SID</Label>
                      <Input placeholder="Your Twilio Account SID" />
                    </div>
                    <div>
                      <Label>Auth Token</Label>
                      <Input type="password" placeholder="Your Twilio Auth Token" />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input placeholder="+1234567890" />
                    </div>
                    <div>
                      <Label>WhatsApp Number</Label>
                      <Input placeholder="whatsapp:+14155238886" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reminder Settings</CardTitle>
                    <CardDescription>Configure reminder behavior</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Default Reminder Days</Label>
                      <Input type="number" defaultValue="3" min="1" max="30" />
                    </div>
                    <div>
                      <Label>Max Reminder Attempts</Label>
                      <Input type="number" defaultValue="3" min="1" max="10" />
                    </div>
                    <div>
                      <Label>Reminder Interval (Hours)</Label>
                      <Input type="number" defaultValue="24" min="1" max="168" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Clinic Information</CardTitle>
                    <CardDescription>Information used in reminder messages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Clinic Name</Label>
                      <Input placeholder="Healthcare Clinic" />
                    </div>
                    <div>
                      <Label>Clinic Address</Label>
                      <Input placeholder="123 Health Street, City" />
                    </div>
                    <div>
                      <Label>Clinic Phone</Label>
                      <Input placeholder="+1234567890" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}