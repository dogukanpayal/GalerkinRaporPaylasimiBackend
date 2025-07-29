import express from 'express';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import {
  uploadReport,
  getAllReports,
  getReportById,
  updateReport,
  deleteReport,
  downloadReportFile,
  getMyReports,
  updateReportStatus,
} from '../controllers/reportController.js';
import upload from '../services/uploadService.js';

const router = express.Router();

// Get all reports (all authenticated users)
router.get('/', authenticateJWT, getAllReports);

// Get reports for the logged-in user
router.get('/my', authenticateJWT, getMyReports);

// Download a report file
router.get('/download/:filename', authenticateJWT, downloadReportFile);

// Upload a new report
router.post('/', authenticateJWT, upload.single('file'), uploadReport);

// Get a single report by ID
router.get('/:id', authenticateJWT, getReportById);

// Update a report's status (manager only)
router.put('/:id/status', authenticateJWT, requireRole('Yonetici'), updateReportStatus);

// Update a report's notes
router.put('/:id', authenticateJWT, updateReport);

// Delete a report
router.delete('/:id', authenticateJWT, deleteReport);

export default router; 