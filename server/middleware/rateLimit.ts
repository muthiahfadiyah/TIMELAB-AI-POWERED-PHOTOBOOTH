// server/middleware/rateLimit.ts

import rateLimit from 'express-rate-limit';

// Login/register: small absolute cap to slow down credential brute-forcing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' },
});

// Kiosk password gate: a wrong-password retry storm shouldn't be free.
// Successful verifies don't count against the cap — the app re-verifies
// every 15s in the background to detect admin-side session changes, and
// that legitimate traffic shouldn't burn the same quota as guessing
// attempts. Only failed (wrong-password) attempts are throttled.
export const sessionVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' },
});

// Gemini image generation costs real money per call — cap it generously
// for a single kiosk device, but enough to stop runaway/scripted abuse.
export const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan generate. Coba lagi nanti.' },
});

// Photo upload: bounds disk usage from a single source.
export const photoUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak upload foto. Coba lagi nanti.' },
});
