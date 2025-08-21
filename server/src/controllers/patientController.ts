import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { Patient } from '../types';

export class PatientController {
  /**
   * Get all patients
   */
  async getPatients(req: Request, res: Response): Promise<void> {
    try {
      const { data: patients, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ patients: patients || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get patient by ID
   */
  async getPatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: patient, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }

      res.json({ patient });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create new patient
   */
  async createPatient(req: Request, res: Response): Promise<void> {
    try {
      const { name, phone, whatsapp_number, preferred_contact_method } = req.body;

      if (!name || !phone) {
        res.status(400).json({ error: 'Name and phone are required' });
        return;
      }

      const { data: patient, error } = await supabase
        .from('patients')
        .insert({
          name,
          phone,
          whatsapp_number,
          preferred_contact_method: preferred_contact_method || 'sms'
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          res.status(400).json({ error: 'Patient with this phone number already exists' });
          return;
        }
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(201).json({ patient });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update patient
   */
  async updatePatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, whatsapp_number, preferred_contact_method } = req.body;

      const { data: patient, error } = await supabase
        .from('patients')
        .update({
          name,
          phone,
          whatsapp_number,
          preferred_contact_method
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ patient });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete patient
   */
  async deletePatient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get patient's appointments
   */
  async getPatientAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', id)
        .order('scheduled_date', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.json({ appointments: appointments || [] });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}