import { twilioClient, twilioConfig } from '../config/twilio';
import { supabase } from '../config/database';
import { MessageContext, ReminderLog } from '../types';

export class MessagingService {
  /**
   * Send WhatsApp message to a patient
   */
  async sendWhatsAppMessage(
    to: string,
    message: string,
    patientId: string,
    appointmentId: string,
    attemptNumber: number = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Ensure the 'to' number has WhatsApp prefix
      const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      const messageResponse = await twilioClient.messages.create({
        body: message,
        from: twilioConfig.whatsappNumber,
        to: whatsappTo,
      });

      // Log the reminder
      await this.logReminder({
        patient_id: patientId,
        appointment_id: appointmentId,
        reminder_type: 'whatsapp',
        message_content: message,
        status: 'sent',
        attempt_number: attemptNumber,
        sent_at: new Date().toISOString(),
      });

      return {
        success: true,
        messageId: messageResponse.sid,
      };
    } catch (error) {
      console.error('WhatsApp message failed:', error);
      
      // Log the failed reminder
      await this.logReminder({
        patient_id: patientId,
        appointment_id: appointmentId,
        reminder_type: 'whatsapp',
        message_content: message,
        status: 'failed',
        attempt_number: attemptNumber,
        sent_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS message to a patient
   */
  async sendSMSMessage(
    to: string,
    message: string,
    patientId: string,
    appointmentId: string,
    attemptNumber: number = 1
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const messageResponse = await twilioClient.messages.create({
        body: message,
        from: twilioConfig.phoneNumber,
        to: to,
      });

      // Log the reminder
      await this.logReminder({
        patient_id: patientId,
        appointment_id: appointmentId,
        reminder_type: 'sms',
        message_content: message,
        status: 'sent',
        attempt_number: attemptNumber,
        sent_at: new Date().toISOString(),
      });

      return {
        success: true,
        messageId: messageResponse.sid,
      };
    } catch (error) {
      console.error('SMS message failed:', error);
      
      // Log the failed reminder
      await this.logReminder({
        patient_id: patientId,
        appointment_id: appointmentId,
        reminder_type: 'sms',
        message_content: message,
        status: 'failed',
        attempt_number: attemptNumber,
        sent_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send message based on patient's preferred contact method
   */
  async sendReminderMessage(
    patientId: string,
    appointmentId: string,
    phoneNumber: string,
    whatsappNumber: string | null,
    preferredMethod: 'sms' | 'whatsapp' | 'both',
    message: string,
    attemptNumber: number = 1
  ): Promise<{ success: boolean; results: any[] }> {
    const results = [];

    if (preferredMethod === 'sms' || preferredMethod === 'both') {
      const smsResult = await this.sendSMSMessage(
        phoneNumber,
        message,
        patientId,
        appointmentId,
        attemptNumber
      );
      results.push({ type: 'sms', ...smsResult });
    }

    if ((preferredMethod === 'whatsapp' || preferredMethod === 'both') && whatsappNumber) {
      const whatsappResult = await this.sendWhatsAppMessage(
        whatsappNumber,
        message,
        patientId,
        appointmentId,
        attemptNumber
      );
      results.push({ type: 'whatsapp', ...whatsappResult });
    }

    const success = results.some(result => result.success);
    return { success, results };
  }

  /**
   * Log reminder attempt to database
   */
  private async logReminder(reminderData: Omit<ReminderLog, 'id'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('reminder_logs')
        .insert(reminderData);

      if (error) {
        console.error('Failed to log reminder:', error);
      }
    } catch (error) {
      console.error('Error logging reminder:', error);
    }
  }

  /**
   * Replace template variables in message
   */
  replaceTemplateVariables(template: string, context: MessageContext): string {
    return template
      .replace(/{{patient_name}}/g, context.patient_name)
      .replace(/{{appointment_date}}/g, context.appointment_date)
      .replace(/{{appointment_type}}/g, context.appointment_type)
      .replace(/{{clinic_name}}/g, context.clinic_name || 'Our Clinic')
      .replace(/{{clinic_address}}/g, context.clinic_address || '')
      .replace(/{{clinic_phone}}/g, context.clinic_phone || '');
  }
}