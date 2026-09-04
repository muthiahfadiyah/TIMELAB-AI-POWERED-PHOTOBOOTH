// server/routes/sessions.ts

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { expireStaleAccessSessions as expireStaleSessions } from '../lib/sessionAccess.js';
import { sessionVerifyLimiter } from '../middleware/rateLimit.js';

const router = Router();

type SessionStatus = 'unused' | 'active' | 'expired' | 'inactive';

function rowToSession(row: any) {
  let status: SessionStatus;
  let remainingMs: number | null = null;

  if (row.activated_at) {
    const activatedAt = new Date(row.activated_at).getTime();
    const expiresAt   = activatedAt + row.duration_minutes * 60 * 1000;
    const remaining   = expiresAt - Date.now();

    if (remaining > 0 && row.is_active) {
      status = 'active';
      remainingMs = remaining;
    } else {
      status = 'expired';
      remainingMs = 0;
    }
  } else {
    status = row.is_active ? 'unused' : 'inactive';
  }

  return {
    id:              row.id,
    password:        row.password,
    durationMinutes: row.duration_minutes,
    label:           row.label || '',
    isActive:        Boolean(row.is_active),
    activatedAt:     row.activated_at || null,
    status,
    remainingMs,
    createdAt:       row.created_at,
  };
}

// ── GET /api/sessions — admin: list all access sessions ───────────────────
router.get('/', requireAdmin, (_req: Request, res: Response) => {
  expireStaleSessions();
  const rows = db.prepare('SELECT * FROM access_sessions ORDER BY created_at DESC').all() as any[];
  res.json(rows.map(rowToSession));
});

// ── POST /api/sessions — admin: create a new access session ───────────────
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { password, durationMinutes, label } = req.body;

  if (!password || !String(password).trim()) {
    res.status(400).json({ error: 'Password required' });
    return;
  }
  const duration = Number(durationMinutes);
  if (!duration || duration <= 0) {
    res.status(400).json({ error: 'Valid duration (minutes) required' });
    return;
  }

  // Prevent duplicate passwords among active/usable sessions
  const existing = db.prepare(
    'SELECT id FROM access_sessions WHERE password = ? AND is_active = 1'
  ).get(password);
  if (existing) {
    res.status(409).json({ error: 'An active session with this password already exists' });
    return;
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO access_sessions (id, password, duration_minutes, label, is_active, activated_at)
    VALUES (?, ?, ?, ?, 1, NULL)
  `).run(id, password, duration, label || '');

  const row = db.prepare('SELECT * FROM access_sessions WHERE id = ?').get(id);
  res.json(rowToSession(row));
});

// ── PUT /api/sessions/:id — admin: update / reactivate ─────────────────────
// Sending { isActive: true } REACTIVATES the session — this resets
// activated_at to NULL so the time limit starts fresh on next use.
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM access_sessions WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const { password, durationMinutes, label, isActive } = req.body;

  const isReactivation = isActive === true;
  const nextIsActive   = isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active;
  const nextActivatedAt = isReactivation ? null : existing.activated_at;

  db.prepare(`
    UPDATE access_sessions
    SET password = ?, duration_minutes = ?, label = ?, is_active = ?, activated_at = ?
    WHERE id = ?
  `).run(
    password         ?? existing.password,
    durationMinutes  ?? existing.duration_minutes,
    label            !== undefined ? label : existing.label,
    nextIsActive,
    nextActivatedAt,
    req.params.id
  );

  const row = db.prepare('SELECT * FROM access_sessions WHERE id = ?').get(req.params.id);
  res.json(rowToSession(row));
});

// ── DELETE /api/sessions/:id — admin: delete a session ─────────────────────
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM access_sessions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json({ success: true });
});

// ── POST /api/sessions/verify — public: check password, return expiry ─────
// Called by PasswordGate on the frontend, and periodically by the app
// to confirm the session is still valid.
//
// IMPORTANT: access is granted ONLY for passwords that match an
// admin-created access session (or the legacy single `session_password`,
// if the admin has explicitly set one). There is NO "anything goes"
// fallback — if neither is configured, every password is rejected and
// the response explains that an admin needs to set one up.
//
// Returns `expiresAt` — an ABSOLUTE timestamp (ms since epoch) — rather
// than a duration, so re-entering the same password after logout reflects
// the time already used (the clock starts on first use, not on each login).
router.post('/verify', sessionVerifyLimiter, (req: Request, res: Response) => {
  const { password } = req.body;

  if (password === undefined || password === null) {
    res.status(400).json({ error: 'Password field required' });
    return;
  }

  expireStaleSessions();

  // 1. Check timed access sessions created by admin
  const session = db.prepare(
    'SELECT * FROM access_sessions WHERE password = ?'
  ).get(password) as any;

  if (session) {
    if (!session.is_active) {
      // Either never activated but admin disabled it, or expired and
      // auto-deactivated by expireStaleSessions()
      const reason = session.activated_at
        ? 'This access code has expired. Please ask an admin to reactivate it.'
        : 'This access code is no longer active. Please contact an admin.';
      res.status(403).json({ error: reason });
      return;
    }

    // First successful use — start the clock
    let activatedAtMs: number;
    if (!session.activated_at) {
      const now = new Date();
      activatedAtMs = now.getTime();
      db.prepare('UPDATE access_sessions SET activated_at = ? WHERE id = ?').run(now.toISOString(), session.id);
    } else {
      activatedAtMs = new Date(session.activated_at).getTime();
    }

    const expiresAt = activatedAtMs + session.duration_minutes * 60 * 1000;

    res.json({
      success: true,
      expiresAt,
      durationMinutes: session.duration_minutes,
      sessionId: session.id,
      label: session.label || '',
    });
    return;
  }

  // 2. Legacy single session_password — only honored if the admin has
  //    explicitly set a non-empty value. Unlimited duration.
  const settingsRow = db.prepare('SELECT session_password FROM settings WHERE id = ?').get('config') as any;
  const legacyPassword = settingsRow?.session_password || '';

  if (legacyPassword && password === legacyPassword) {
    res.json({ success: true, expiresAt: null }); // null = unlimited
    return;
  }

  // 3. No match. If NOTHING has been configured at all, say so explicitly
  //    rather than rejecting with a generic "incorrect password" — but
  //    still reject (no bypass).
  const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM access_sessions').get() as any).c;
  if (sessionCount === 0 && !legacyPassword) {
    res.status(403).json({ error: 'No access sessions have been configured yet. Please ask an admin to set one up.' });
    return;
  }

  res.status(401).json({ error: 'Incorrect password' });
});

export default router;