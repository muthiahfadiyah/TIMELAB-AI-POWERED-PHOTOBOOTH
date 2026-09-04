// server/routes/tokens.ts

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const COST_PER_SESSION_IDR = 660;

// POST /api/tokens — simpan log dari setiap generate foto
router.post('/', (req: Request, res: Response) => {
  const { promptTokens, candidateTokens, totalTokens } = req.body;
  if (typeof promptTokens !== 'number') {
    res.status(400).json({ error: 'promptTokens diperlukan' });
    return;
  }
  const id = randomUUID();
  db.prepare('INSERT INTO token_logs (id, prompt_tokens, candidate_tokens, total_tokens) VALUES (?, ?, ?, ?)')
    .run(id, promptTokens, candidateTokens ?? 0, totalTokens ?? 0);
  res.json({ id });
});

// GET /api/tokens/stats — statistik untuk dashboard admin
router.get('/stats', requireAdmin, (_req: Request, res: Response) => {
  const allTime = db.prepare(`
    SELECT
      COUNT(*)                           AS sessions,
      COALESCE(SUM(prompt_tokens), 0)    AS prompt_tokens,
      COALESCE(SUM(candidate_tokens), 0) AS candidate_tokens,
      COALESCE(SUM(total_tokens), 0)     AS total_tokens
    FROM token_logs
  `).get() as any;

  const today = db.prepare(`
    SELECT
      COUNT(*)                           AS sessions,
      COALESCE(SUM(prompt_tokens), 0)    AS prompt_tokens,
      COALESCE(SUM(candidate_tokens), 0) AS candidate_tokens,
      COALESCE(SUM(total_tokens), 0)     AS total_tokens
    FROM token_logs
    WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')
  `).get() as any;

  const recent = db.prepare(`
    SELECT id, prompt_tokens, candidate_tokens, total_tokens, created_at
    FROM token_logs
    ORDER BY created_at DESC
    LIMIT 20
  `).all() as any[];

  res.json({
    costPerSession: COST_PER_SESSION_IDR,
    allTime: {
      sessions:        allTime.sessions,
      promptTokens:    allTime.prompt_tokens,
      candidateTokens: allTime.candidate_tokens,
      totalTokens:     allTime.total_tokens,
      costIdr:         allTime.sessions * COST_PER_SESSION_IDR,
    },
    today: {
      sessions:        today.sessions,
      promptTokens:    today.prompt_tokens,
      candidateTokens: today.candidate_tokens,
      totalTokens:     today.total_tokens,
      costIdr:         today.sessions * COST_PER_SESSION_IDR,
    },
    recent: recent.map(r => ({
      id:              r.id,
      promptTokens:    r.prompt_tokens,
      candidateTokens: r.candidate_tokens,
      totalTokens:     r.total_tokens,
      costIdr:         COST_PER_SESSION_IDR,
      createdAt:       r.created_at,
    })),
  });
});

export default router;
