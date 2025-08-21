import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { Appointment } from '../types';

export class AppointmentController {
  /**
   * Get all appointments
   */
  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { status, appointment_type, date_from, date_to } = req.query;

      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            name,
            phone,
            whatsapp_number,
            preferred_contact_method
          )
        `);

      if (status) {
        query = query.eq('status', status);
      }

      if (appointment_type) {
        query = query.eq('appointment_type', appointment_type);
      }

      if (date_from) {
        query = query.gte('scheduled_date', date_from);
      }

      if (date_to) {
        query = query.lte('scheduled_date', date_to);
      }

      const { data: appointments, error } = await query.order('scheduled_date', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ appointments: appointments || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            name,
            phone,
            whatsapp_number,
            preferred_contact_method
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      res.json({ appointment });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create new appointment
   */
  async createAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { patient_id, appointment_type, scheduled_date, notes } = req.body;

      if (!patient_id || !appointment_type || !scheduled_date) {
        res.status(400).json({ error: 'Patient ID, appointment type, and scheduled date are required' });
        return;
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id,
          appointment_type,
          scheduled_date,
          notes,
          status: 'scheduled'
        })
        .select(`
          *,
          patients (
            id,
            name,
            phone,
            whatsapp_number,
            preferred_contact_method
          )
        `)
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(201).json({ appointment });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { appointment_type, scheduled_date, status, notes } = req.body;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({
          appointment_type,
          scheduled_date,
          status,
          notes
        })
        .eq('id', id)
        .select(`
          *,
          patients (
            id,
            name,
            phone,
            whatsapp_number,
            preferred_contact_method
          )
        `)
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ appointment });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ message: 'Appointment deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get defaulters (missed appointments)
   */
  async getDefaulters(req: Request, res: Response): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: defaulters, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients (
            id,
            name,
            phone,
            whatsapp_number,
            preferred_contact_method
          )
        `)
        .eq('status', 'scheduled')
        .lt('scheduled_date', today)
        .order('scheduled_date', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ defaulters: defaulters || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Mark appointment as completed
   */
  async markCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ appointment, message: 'Appointment marked as completed' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Mark appointment as missed
   */
  async markMissed(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update({ status: 'missed' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ appointment, message: 'Appointment marked as missed' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}