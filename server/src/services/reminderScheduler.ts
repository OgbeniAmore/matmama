import cron from 'node-cron';
import { supabase } from '../config/database';
import { MessagingService } from './messagingService';
import { Patient, Appointment, ReminderTemplate, MessageContext } from '../types';

export class ReminderScheduler {
  private messagingService: MessagingService;
  private isRunning: boolean = false;

  constructor() {
    this.messagingService = new MessagingService();
  }

  /**
   * Start the reminder scheduler
   * Runs every hour to check for upcoming appointments that need reminders
   */
  start(): void {
    if (this.isRunning) {
      console.log('Reminder scheduler is already running');
      return;
    }

    console.log('Starting reminder scheduler...');
    this.isRunning = true;

    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
      console.log('Running reminder check...');
      await this.checkAndSendReminders();
    });

    // Also run immediately on start for testing
    this.checkAndSendReminders();
  }

  /**
   * Stop the reminder scheduler
   */
  stop(): void {
    console.log('Stopping reminder scheduler...');
    this.isRunning = false;
    cron.destroy();
  }

  /**
   * Check for appointments that need reminders and send them
   */
  async checkAndSendReminders(): Promise<void> {
    try {
      const upcomingAppointments = await this.getUpcomingAppointments();
      console.log(`Found ${upcomingAppointments.length} appointments to process`);

      for (const appointment of upcomingAppointments) {
        await this.processAppointmentReminder(appointment);
      }
    } catch (error) {
      console.error('Error in reminder check:', error);
    }
  }

  /**
   * Get appointments that need reminders
   */
  private async getUpcomingAppointments(): Promise<any[]> {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients (*)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .lte('scheduled_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }

    return appointments || [];
  }

  /**
   * Process reminder for a specific appointment
   */
  private async processAppointmentReminder(appointment: any): Promise<void> {
    try {
      const patient = appointment.patients;
      const appointmentDate = new Date(appointment.scheduled_date);
      const today = new Date();
      const daysUntilAppointment = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Get reminder template for this appointment type
      const template = await this.getReminderTemplate(appointment.appointment_type, daysUntilAppointment);
      if (!template) {
        console.log(`No active template found for ${appointment.appointment_type} with ${daysUntilAppointment} days`);
        return;
      }

      // Check if we've already sent a reminder for this appointment with this template
      const existingReminder = await this.checkExistingReminder(appointment.id, template.id, daysUntilAppointment);
      if (existingReminder) {
        console.log(`Reminder already sent for appointment ${appointment.id}`);
        return;
      }

      // Check how many reminder attempts we've made
      const reminderCount = await this.getReminderAttemptCount(appointment.id);
      const maxAttempts = parseInt(process.env.MAX_REMINDER_ATTEMPTS || '3');
      
      if (reminderCount >= maxAttempts) {
        console.log(`Maximum reminder attempts (${maxAttempts}) reached for appointment ${appointment.id}`);
        return;
      }

      // Prepare message context
      const messageContext: MessageContext = {
        patient_name: patient.name,
        appointment_date: appointmentDate.toLocaleDateString(),
        appointment_type: this.formatAppointmentType(appointment.appointment_type),
        clinic_name: process.env.CLINIC_NAME || 'Healthcare Clinic',
        clinic_address: process.env.CLINIC_ADDRESS || '',
        clinic_phone: process.env.CLINIC_PHONE || '',
      };

      // Generate message from template
      const message = this.messagingService.replaceTemplateVariables(template.message_template, messageContext);

      // Send reminder
      const result = await this.messagingService.sendReminderMessage(
        patient.id,
        appointment.id,
        patient.phone,
        patient.whatsapp_number,
        patient.preferred_contact_method,
        message,
        reminderCount + 1
      );

      if (result.success) {
        console.log(`Reminder sent successfully for appointment ${appointment.id}`);
      } else {
        console.error(`Failed to send reminder for appointment ${appointment.id}`);
      }

    } catch (error) {
      console.error(`Error processing reminder for appointment ${appointment.id}:`, error);
    }
  }

  /**
   * Get reminder template for appointment type and days before
   */
  private async getReminderTemplate(appointmentType: string, daysUntilAppointment: number): Promise<ReminderTemplate | null> {
    const { data: templates, error } = await supabase
      .from('reminder_templates')
      .select('*')
      .eq('appointment_type', appointmentType)
      .eq('is_active', true)
      .lte('days_before_appointment', daysUntilAppointment)
      .order('days_before_appointment', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching reminder template:', error);
      return null;
    }

    return templates && templates.length > 0 ? templates[0] : null;
  }

  /**
   * Check if reminder has already been sent
   */
  private async checkExistingReminder(appointmentId: string, templateId: string, daysUntilAppointment: number): Promise<boolean> {
    const { data: reminders, error } = await supabase
      .from('reminder_logs')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('status', 'sent')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Within last 24 hours

    if (error) {
      console.error('Error checking existing reminders:', error);
      return false;
    }

    return reminders && reminders.length > 0;
  }

  /**
   * Get the number of reminder attempts for an appointment
   */
  private async getReminderAttemptCount(appointmentId: string): Promise<number> {
    const { data: reminders, error } = await supabase
      .from('reminder_logs')
      .select('attempt_number')
      .eq('appointment_id', appointmentId)
      .order('attempt_number', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error getting reminder attempt count:', error);
      return 0;
    }

    return reminders && reminders.length > 0 ? reminders[0].attempt_number : 0;
  }

  /**
   * Format appointment type for display
   */
  private formatAppointmentType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'immunization': 'Immunization',
      'anc': 'Antenatal Care (ANC)',
      'family_planning': 'Family Planning',
      'tuberculosis': 'Tuberculosis Care'
    };
    return typeMap[type] || type;
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualCheck(): Promise<void> {
    console.log('Manual reminder check triggered');
    await this.checkAndSendReminders();
  }
}