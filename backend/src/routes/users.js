import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import {
  getMe,
  updateMe,
  deleteMe,
  getReporters,
} from '../controllers/userController.js';

const router = express.Router();

// Get the currently logged-in user's profile
router.get('/me', authenticateJWT, getMe);

// Get a list of users who have submitted reports (for manager filters)
router.get('/reporters', authenticateJWT, getReporters);

// Update the currently logged-in user's profile
router.put('/me', authenticateJWT, updateMe);
router.delete('/me', authenticateJWT, deleteMe);

export default router; 