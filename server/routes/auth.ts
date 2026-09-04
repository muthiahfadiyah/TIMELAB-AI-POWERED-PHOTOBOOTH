// server/routes/auth.ts

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth, JWT_SECRET, AuthRequest } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', authLimiter, (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email dan password diperlukan' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Email atau password salah' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role, displayName: user.display_name }
  });
});

router.post('/register', authLimiter, (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email dan password diperlukan' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password minimal 6 karakter' });
    return;
  }

  // Hanya izinkan registrasi jika belum ada user sama sekali (first-time setup)
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  if (userCount > 0) {
    res.status(403).json({ error: 'Registrasi dinonaktifkan. Gunakan npm run setup untuk menambah admin.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(400).json({ error: 'Email sudah terdaftar' });
    return;
  }

  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  const name = displayName || email.split('@')[0];

  db.prepare('INSERT INTO users (id, email, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, hash, 'admin', name);

  const token = jwt.sign({ id, email, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id, email, role: 'admin', displayName: name } });
});

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

export default router;
