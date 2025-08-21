import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { ReminderScheduler } from './services/reminderScheduler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize and start reminder scheduler
const reminderScheduler = new ReminderScheduler();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  reminderScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  reminderScheduler.stop();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Healthcare Reminder Server running on port ${PORT}`);
  console.log(`📱 API endpoints available at http://localhost:${PORT}/api`);
  
  // Start the reminder scheduler
  reminderScheduler.start();
  console.log('⏰ Reminder scheduler started');
});

export default app;