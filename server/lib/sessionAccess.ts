// server/lib/sessionAccess.ts

import db from '../db.js';

// Auto-expire sessions whose activation window has passed.
export function expireStaleAccessSessions() {
  const rows = db.prepare(
    'SELECT id, duration_minutes, activated_at FROM access_sessions WHERE is_active = 1 AND activated_at IS NOT NULL'
  ).all() as any[];

  const now = Date.now();
  for (const r of rows) {
    const activatedAt = new Date(r.activated_at).getTime();
    if (now >= activatedAt + r.duration_minutes * 60 * 1000) {
      db.prepare('UPDATE access_sessions SET is_active = 0 WHERE id = ?').run(r.id);
    }
  }
}

// Read-only check used to gate kiosk-only endpoints (e.g. /api/generate,
// POST /api/photos). Mirrors the matching rules in POST /api/sessions/verify
// but has no activation side-effect — that only happens through the gate
// itself (PasswordGate -> /api/sessions/verify).
export function isSessionPasswordValid(password: string | undefined | null): boolean {
  const settingsRow = db.prepare('SELECT session_password FROM settings WHERE id = ?').get('config') as any;
  const legacyPassword = settingsRow?.session_password || '';
  const sessionCount = (db.prepare('SELECT COUNT(*) as c FROM access_sessions').get() as any).c;
  const nothingConfigured = sessionCount === 0 && !legacyPassword;

  if (!password) return nothingConfigured;

  expireStaleAccessSessions();

  const session = db.prepare('SELECT is_active FROM access_sessions WHERE password = ?').get(password) as any;
  if (session) return Boolean(session.is_active);

  if (legacyPassword && password === legacyPassword) return true;

  return nothingConfigured;
}
