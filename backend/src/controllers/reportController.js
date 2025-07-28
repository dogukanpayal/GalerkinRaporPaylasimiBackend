import Report from '../models/Report.js';
import User from '../models/User.js';
import path from 'path';
import { Op } from 'sequelize';

const getPagination = (page, size) => {
  const limit = size ? +size : 10; // Default limit is 10
  const offset = page ? (page - 1) * limit : 0;
  return { limit, offset };
};

const getPagingData = (data, page, limit) => {
  const { count: totalItems, rows: reports } = data;
  const currentPage = page ? +page : 1;
  const totalPages = Math.ceil(totalItems / limit);
  return { totalItems, reports, totalPages, currentPage };
};

export async function uploadReport(req, res) {
  if (!req.file) return res.status(400).json({ message: 'File is required' });
  try {
    const report = await Report.create({
      filePath: req.file.filename,
      notes: req.body.notes,
      userId: req.user.id,
      date: new Date(),
    });
    // Fetch the report with the associated user
    const reportWithUser = await Report.findByPk(report.id, {
      include: [{ model: User, attributes: ['id', 'email', 'firstName', 'lastName', 'role'] }],
    });
    console.log('Created report with user:', reportWithUser);
    // Convert Sequelize instance to a plain object before sending
    res.status(201).json(reportWithUser.get({ plain: true }));
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
}

export const getAllReports = async (req, res) => {
  try {
    const { page, size, sortBy, sortOrder, date, status, userId } = req.query;
    const where = {};
    if (date && date.trim() !== '') where.createdAt = { [Op.gte]: new Date(date) };
    if (status && status.trim() !== '') where.status = status;
    if (userId && userId.trim() !== '') where.userId = userId;

    const { limit, offset } = getPagination(page, size);

    const order = [];
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder || 'desc';

    if (sortField === 'employee') {
      order.push([User, 'firstName', sortDirection]);
      order.push([User, 'lastName', sortDirection]);
    } else {
      order.push([sortField, sortDirection]);
    }

    const data = await Report.findAndCountAll({
      where,
      include: [{
        model: User,
        attributes: ['firstName', 'lastName', 'email'],
      }],
      order,
      limit,
      offset,
    });

    const plainRows = data.rows.map(row => row.get({ plain: true }));
    const response = getPagingData({ ...data, rows: plainRows }, page, limit);
    
    res.json(response);
  } catch (err) {
    console.error('Error fetching reports:', err, err.stack);
    res.status(500).json({ message: 'Error fetching reports' });
  }
};

export async function getMyReports(req, res) {
  try {
    const { page, size, sortBy, sortOrder, date, status } = req.query;
    const where = { userId: req.user.id }; // Filter by logged-in user
    if (date && date.trim() !== '') where.createdAt = { [Op.gte]: new Date(date) };
    if (status && status.trim() !== '') where.status = status;

    const { limit, offset } = getPagination(page, size);

    const order = [];
    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder || 'desc';

    // No need to sort by employee here since it's always the same user
    order.push([sortField, sortDirection]);

    const data = await Report.findAndCountAll({
      where,
      include: [{ model: User, attributes: ['firstName', 'lastName', 'email'] }],
      order,
      limit,
      offset,
    });

    const plainRows = data.rows.map(row => row.get({ plain: true }));
    const response = getPagingData({ ...data, rows: plainRows }, page, limit);

    res.json(response);
  } catch (err) {
    console.error('Error fetching my reports:', err, err.stack);
    res.status(500).json({ message: 'Error fetching my reports' });
  }
};

export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Basic validation
    if (!status || !['Submitted', 'Reviewed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    report.status = status;
    await report.save();

    res.json(report.get({ plain: true }));
  } catch (err) {
    console.error('Error updating report status:', err, err.stack);
    res.status(500).json({ message: 'Failed to update report status.' });
  }
};

export async function getReportById(req, res) {
  const { id } = req.params;
  try {
    const report = await Report.findByPk(id, {
      include: [{ model: User, attributes: ['id', 'email', 'role'] }],
    });
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Only owner or manager can view
    if (req.user.role !== 'manager' && req.user.id !== report.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch report', error: err.message });
  }
}

export async function downloadReportFile(req, res) {
  const { filename } = req.params;
  const directoryPath = path.resolve('uploads');
  const filePath = path.join(directoryPath, filename);

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('File download error:', err);
      if (!res.headersSent) {
        res.status(404).send({ message: 'Cannot download the file. File not found.' });
      }
    }
  });
}

export async function updateReport(req, res) {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.userId !== req.user.id && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden: You can only edit your own reports' });
    }

    report.notes = notes;
    await report.save();

    const updatedReportWithUser = await Report.findByPk(id, {
      include: [{ model: User, attributes: ['id', 'email', 'firstName', 'lastName', 'role'] }],
    });

    res.json(updatedReportWithUser.get({ plain: true }));
  } catch (err) {
    console.error('updateReport error:', err, err.stack);
    res.status(500).json({ message: 'Failed to update report', error: err.message });
  }
}

export async function deleteReport(req, res) {
  const { id } = req.params;
  try {
    const report = await Report.findByPk(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.userId !== req.user.id && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own reports' });
    }
    
    // Optional: Delete the file from the server
    // const filePath = path.resolve('uploads', report.filePath);
    // fs.unlink(filePath, (err) => {
    //   if (err) console.error("Failed to delete file:", err);
    // });

    await report.destroy();
    res.status(204).send();
  } catch (err) {
    console.error('deleteReport error:', err, err.stack);
    res.status(500).json({ message: 'Failed to delete report', error: err.message });
  }
} 