import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export async function register(req, res) {
  // Debug log to check the incoming request body
  console.log('Register req.body:', req.body);
  
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password || !firstName || !lastName)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing)
      return res.status(400).json({ message: 'Email already registered' });
    
    // Default role for all new registrations is 'Calisan'
    const role = 'Calisan';

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, firstName, lastName });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
}

export async function login(req, res) {
  // Debug log for troubleshooting
  console.log('Login req.body:', req.body);
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(401).json({ message: 'Invalid credentials.' });

    // Debug logs for troubleshooting
    console.log('Gelen şifre:', password, 'Hash:', user.passwordHash);
    const match = await bcrypt.compare(password, user.passwordHash);
    console.log('Karşılaştırma sonucu:', match);

    if (!match)
      return res.status(401).json({ message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
} 