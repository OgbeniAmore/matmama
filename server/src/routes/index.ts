import express from 'express';
import { PatientController } from '../controllers/patientController';
import { AppointmentController } from '../controllers/appointmentController';
import { ReminderController } from '../controllers/reminderController';

const router = express.Router();

// Initialize controllers
const patientController = new PatientController();
const appointmentController = new AppointmentController();
const reminderController = new ReminderController();

// Patient routes
router.get('/patients', patientController.getPatients.bind(patientController));
router.get('/patients/:id', patientController.getPatient.bind(patientController));
router.post('/patients', patientController.createPatient.bind(patientController));
router.put('/patients/:id', patientController.updatePatient.bind(patientController));
router.delete('/patients/:id', patientController.deletePatient.bind(patientController));
router.get('/patients/:id/appointments', patientController.getPatientAppointments.bind(patientController));

// Appointment routes
router.get('/appointments', appointmentController.getAppointments.bind(appointmentController));
router.get('/appointments/:id', appointmentController.getAppointment.bind(appointmentController));
router.post('/appointments', appointmentController.createAppointment.bind(appointmentController));
router.put('/appointments/:id', appointmentController.updateAppointment.bind(appointmentController));
router.delete('/appointments/:id', appointmentController.deleteAppointment.bind(appointmentController));
router.get('/appointments/defaulters/list', appointmentController.getDefaulters.bind(appointmentController));
router.patch('/appointments/:id/complete', appointmentController.markCompleted.bind(appointmentController));
router.patch('/appointments/:id/missed', appointmentController.markMissed.bind(appointmentController));

// Reminder routes
router.get('/reminders/logs', reminderController.getReminderLogs.bind(reminderController));
router.post('/reminders/send', reminderController.sendManualReminder.bind(reminderController));
router.post('/reminders/trigger-check', reminderController.triggerReminderCheck.bind(reminderController));
router.get('/reminders/stats', reminderController.getReminderStats.bind(reminderController));

// Reminder template routes
router.get('/reminder-templates', reminderController.getReminderTemplates.bind(reminderController));
router.post('/reminder-templates', reminderController.createReminderTemplate.bind(reminderController));
router.put('/reminder-templates/:id', reminderController.updateReminderTemplate.bind(reminderController));
router.delete('/reminder-templates/:id', reminderController.deleteReminderTemplate.bind(reminderController));

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default router;