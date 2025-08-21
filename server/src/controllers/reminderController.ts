import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { MessagingService } from '../services/messagingService';
import { ReminderScheduler } from '../services/reminderScheduler';

export class ReminderController {
  private messagingService: MessagingService;
  private reminderScheduler: ReminderScheduler;

  constructor() {
    this.messagingService = new MessagingService();
    this.reminderScheduler = new ReminderScheduler();
  }

  /**
   * Get reminder logs
   */
  async getReminderLogs(req: Request, res: Response): Promise<void> {
    try {
      const { patient_id, appointment_id, status, limit = 100 } = req.query;

      let query = supabase
        .from('reminder_logs')
        .select(`
          *,
          patients (
            id,
            name,
            phone
          ),
          appointments (
            id,
            appointment_type,
            scheduled_date
          )
        `);

      if (patient_id) {
        query = query.eq('patient_id', patient_id);
      }

      if (appointment_id) {
        query = query.eq('appointment_id', appointment_id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data: logs, error } = await query
        .order('sent_at', { ascending: false })
        .limit(parseInt(limit as string));

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ logs: logs || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send manual reminder
   */
  async sendManualReminder(req: Request, res: Response): Promise<void> {
    try {
      const { patient_id, appointment_id, message, reminder_type } = req.body;

      if (!patient_id || !appointment_id || !message) {
        res.status(400).json({ error: 'Patient ID, appointment ID, and message are required' });
        return;
      }

      // Get patient and appointment details
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patient_id)
        .single();

      if (patientError || !patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointment_id)
        .single();

      if (appointmentError || !appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Get current attempt number
      const { data: existingLogs } = await supabase
        .from('reminder_logs')
        .select('attempt_number')
        .eq('appointment_id', appointment_id)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = existingLogs && existingLogs.length > 0 ? existingLogs[0].attempt_number + 1 : 1;

      let result;
      if (reminder_type === 'sms') {
        result = await this.messagingService.sendSMSMessage(
          patient.phone,
          message,
          patient_id,
          appointment_id,
          attemptNumber
        );
      } else if (reminder_type === 'whatsapp') {
        if (!patient.whatsapp_number) {
          res.status(400).json({ error: 'Patient does not have a WhatsApp number' });
          return;
        }
        result = await this.messagingService.sendWhatsAppMessage(
          patient.whatsapp_number,
          message,
          patient_id,
          appointment_id,
          attemptNumber
        );
      } else {
        // Send via preferred method
        result = await this.messagingService.sendReminderMessage(
          patient_id,
          appointment_id,
          patient.phone,
          patient.whatsapp_number,
          patient.preferred_contact_method,
          message,
          attemptNumber
        );
      }

      res.json({ success: result.success, result });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get reminder templates
   */
  async getReminderTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { appointment_type, is_active } = req.query;

      let query = supabase.from('reminder_templates').select('*');

      if (appointment_type) {
        query = query.eq('appointment_type', appointment_type);
      }

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      const { data: templates, error } = await query.order('appointment_type').order('days_before_appointment');

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ templates: templates || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create reminder template
   */
  async createReminderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { appointment_type, template_name, message_template, days_before_appointment, is_active } = req.body;

      if (!appointment_type || !template_name || !message_template) {
        res.status(400).json({ error: 'Appointment type, template name, and message template are required' });
        return;
      }

      const { data: template, error } = await supabase
        .from('reminder_templates')
        .insert({
          appointment_type,
          template_name,
          message_template,
          days_before_appointment: days_before_appointment || 3,
          is_active: is_active !== undefined ? is_active : true
        })
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(201).json({ template });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update reminder template
   */
  async updateReminderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { appointment_type, template_name, message_template, days_before_appointment, is_active } = req.body;

      const { data: template, error } = await supabase
        .from('reminder_templates')
        .update({
          appointment_type,
          template_name,
          message_template,
          days_before_appointment,
          is_active
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ template });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete reminder template
   */
  async deleteReminderTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('reminder_templates')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ message: 'Reminder template deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Trigger manual reminder check
   */
  async triggerReminderCheck(req: Request, res: Response): Promise<void> {
    try {
      await this.reminderScheduler.triggerManualCheck();
      res.json({ message: 'Reminder check triggered successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats(req: Request, res: Response): Promise<void> {
    try {
      const { date_from, date_to } = req.query;

      let query = supabase.from('reminder_logs').select('status, reminder_type');

      if (date_from) {
        query = query.gte('sent_at', date_from);
      }

      if (date_to) {
        query = query.lte('sent_at', date_to);
      }

      const { data: logs, error } = await query;

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      // Calculate statistics
      const stats = {
        total: logs?.length || 0,
        sent: logs?.filter(log => log.status === 'sent').length || 0,
        failed: logs?.filter(log => log.status === 'failed').length || 0,
        delivered: logs?.filter(log => log.status === 'delivered').length || 0,
        sms: logs?.filter(log => log.reminder_type === 'sms').length || 0,
        whatsapp: logs?.filter(log => log.reminder_type === 'whatsapp').length || 0,
      };

      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}