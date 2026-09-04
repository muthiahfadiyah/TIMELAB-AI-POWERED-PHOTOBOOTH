// server/routes/users.ts

import { Router, Response } from 'express';
import db from '../db.js';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAdmin, (_req: AuthRequest, res: Response) => {
  const rows = db.prepare('SELECT id, email, role, display_name, created_at FROM users ORDER BY created_at').all() as any[];
  res.json(rows.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    displayName: u.display_name,
    createdAt: u.created_at
  })));
});

router.delete('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  if (req.user?.id === req.params.id) {
    res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
    return;
  }
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'User tidak ditemukan' });
    return;
  }
  res.json({ success: true });
});

export default router;
