import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import sequelize from './utils/db.js';
import User from './models/User.js';
import Report from './models/Report.js';
import authRoutes from './routes/auth.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js'; // Import new user routes
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Debug middleware: log all incoming requests
app.use((req, res, next) => {
  console.log('Gelen istek:', req.method, req.url);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve('uploads')));

// Routes
app.use('/auth', authRoutes);
app.use('/reports', reportRoutes);
app.use('/users', userRoutes); // Mount new user routes

// Health check
app.get('/', (req, res) => res.send('API is running'));

// Sync DB and start server
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync database:', err);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err, err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
}); 