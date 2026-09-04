// server/middleware/sessionGate.ts

import { Request, Response, NextFunction } from 'express';
import { isSessionPasswordValid } from '../lib/sessionAccess.js';

// Guards kiosk-only endpoints (Gemini generation, photo upload) that the
// public PasswordGate is meant to protect. The gate itself only sets a
// client-side flag, so without this check anyone who finds the URL could
// call these endpoints directly — bypassing the password and burning
// Gemini API quota. The frontend sends the password it already has stored
// from passing the gate.
export function requireSessionAccess(req: Request, res: Response, next: NextFunction) {
  const password = req.header('x-session-password');
  if (!isSessionPasswordValid(password)) {
    res.status(403).json({ error: 'Sesi tidak valid atau sudah berakhir. Silakan masuk ulang.' });
    return;
  }
  next();
}
