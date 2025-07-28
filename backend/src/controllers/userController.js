import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Report from '../models/Report.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'role'],
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReporters = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{
        model: Report,
        attributes: [], // We only need to know that a report exists
        required: true, // This creates an INNER JOIN
      }],
      attributes: ['id', 'firstName', 'lastName'],
      group: ['User.id', 'User.firstName', 'User.lastName'],
      order: [['firstName', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    console.error('Error fetching reporters:', err);
    res.status(500).json({ message: 'Failed to fetch reporters' });
  }
};

export const updateMe = async (req, res) => {
  const { firstName, lastName, email } = req.body;
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    await user.save();

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
}

export async function deleteMe(req, res) {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
} 