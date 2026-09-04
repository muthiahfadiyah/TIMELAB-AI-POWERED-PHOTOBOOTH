// server/routes/styles.ts

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Valid category values. 'unisex' is accepted as an alias for 'universal'
// to handle imports from older JSON files or external tools.
const VALID_CATEGORIES = ['universal', 'male', 'female', 'group'];

function resolveCategory(raw: string | undefined): string {
  if (!raw) return 'universal';
  const normalised = raw.toString().toLowerCase().trim();
  if (normalised === 'unisex') return 'universal';
  return VALID_CATEGORIES.includes(normalised) ? normalised : 'universal';
}

function rowToStyle(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    prompt: row.prompt,
    preview: row.preview || '',
    assetImage: row.asset_image || null,
    isActive: Boolean(row.is_active),
    // category: 'universal' | 'male' | 'female' | 'group'
    // kept as 'genderTarget' on the response object so the frontend
    // doesn't need a rename — the field now carries broader meaning.
    genderTarget: resolveCategory(row.gender_target),
    preserveIdentity: row.preserve_identity === undefined ? true : Boolean(row.preserve_identity),
  };
}

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM photo_styles ORDER BY name').all();
  res.json(rows.map(rowToStyle));
});

router.post('/', requireAdmin, (req: Request, res: Response) => {
  const { id, name, description, prompt, preview, assetImage, genderTarget, isActive, preserveIdentity } = req.body;
  if (!name || !prompt) {
    res.status(400).json({ error: 'name dan prompt diperlukan' });
    return;
  }

  const styleId = id || name.toLowerCase().replace(/\s+/g, '-') + '-' + randomUUID().slice(0, 6);
  const category = resolveCategory(genderTarget);
  const resolvedPreview = preview || '';
  // No preview → always draft, never shows on kiosk with broken image
  const resolvedIsActive = resolvedPreview ? (isActive === false ? 0 : 1) : 0;
  const resolvedPreserveIdentity = preserveIdentity === false ? 0 : 1;

  db.prepare(`
    INSERT INTO photo_styles (id, name, description, prompt, preview, asset_image, is_active, gender_target, preserve_identity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(styleId, name, description || null, prompt, resolvedPreview, assetImage || null, resolvedIsActive, category, resolvedPreserveIdentity);

  const row = db.prepare('SELECT * FROM photo_styles WHERE id = ?').get(styleId);
  res.json(rowToStyle(row));
});

router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM photo_styles WHERE id = ?').get(id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Style tidak ditemukan' });
    return;
  }

  const { name, description, prompt, preview, assetImage, isActive, genderTarget, preserveIdentity } = req.body;

  const category = genderTarget !== undefined
    ? resolveCategory(genderTarget)
    : resolveCategory(existing.gender_target);

  db.prepare(`
    UPDATE photo_styles
    SET name = ?, description = ?, prompt = ?, preview = ?, asset_image = ?, is_active = ?, gender_target = ?, preserve_identity = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    description !== undefined ? description : existing.description,
    prompt ?? existing.prompt,
    preview ?? existing.preview,
    assetImage !== undefined ? assetImage : existing.asset_image,
    isActive !== undefined ? (isActive ? 1 : 0) : existing.is_active,
    category,
    preserveIdentity !== undefined ? (preserveIdentity ? 1 : 0) : existing.preserve_identity,
    id
  );

  const row = db.prepare('SELECT * FROM photo_styles WHERE id = ?').get(id);
  res.json(rowToStyle(row));
});

router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const result = db.prepare('DELETE FROM photo_styles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Style tidak ditemukan' });
    return;
  }
  res.json({ success: true });
});

export default router;
