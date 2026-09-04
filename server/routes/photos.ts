// server/routes/photos.ts

import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireSessionAccess } from '../middleware/sessionGate.js';
import { photoUploadLimiter } from '../middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PHOTOS_DIR = join(__dirname, '..', '..', 'uploads', 'photos');

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function isJpegOrPng(buffer: Buffer): boolean {
  const isJpeg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  return isJpeg || isPng;
}

function saveFile(base64: string, filename: string): string {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
  const data = match ? match[1] : base64;
  const buffer = Buffer.from(data, 'base64');

  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Ukuran gambar tidak valid');
  }
  if (!isJpegOrPng(buffer)) {
    throw new Error('Format gambar tidak didukung');
  }

  writeFileSync(join(PHOTOS_DIR, filename), buffer);
  return `/uploads/photos/${filename}`;
}

function deleteFile(filePath: string | null) {
  if (!filePath || !filePath.startsWith('/uploads/')) return;
  const abs = join(PHOTOS_DIR, '..', '..', filePath);
  if (existsSync(abs)) unlinkSync(abs);
}

const router = Router();

router.post('/', requireSessionAccess, photoUploadLimiter, (req: Request, res: Response) => {
  const { image, originalImage } = req.body;
  if (!image) {
    res.status(400).json({ error: 'Image diperlukan' });
    return;
  }

  try {
    const id = randomUUID();
    const aiPath = saveFile(image, `${id}-ai.jpg`);
    const origPath = originalImage ? saveFile(originalImage, `${id}-original.jpg`) : null;

    db.prepare('INSERT INTO shared_photos (id, image, original_image) VALUES (?, ?, ?)').run(id, aiPath, origPath);
    res.json({ id });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Gagal menyimpan foto' });
  }
});

router.get('/', requireAdmin, (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  const rows = db.prepare(
    'SELECT id, created_at FROM shared_photos ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(limit, offset) as any[];

  const total = (db.prepare('SELECT COUNT(*) as c FROM shared_photos').get() as any).c;

  res.json({
    photos: rows.map(r => ({ id: r.id, createdAt: r.created_at })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM shared_photos WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Foto tidak ditemukan' });
    return;
  }
  res.json({
    id: row.id,
    image: row.image,
    originalImage: row.original_image || null,
    createdAt: row.created_at,
  });
});

router.delete('/bulk', requireAdmin, (req: Request, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'IDs diperlukan' });
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`SELECT image, original_image FROM shared_photos WHERE id IN (${placeholders})`).all(...ids) as any[];
  rows.forEach(r => { deleteFile(r.image); deleteFile(r.original_image); });
  const result = db.prepare(`DELETE FROM shared_photos WHERE id IN (${placeholders})`).run(...ids);
  res.json({ deleted: result.changes });
});

router.delete('/cleanup', requireAdmin, (req: Request, res: Response) => {
  const { before } = req.query;
  if (!before) {
    res.status(400).json({ error: 'Parameter before diperlukan' });
    return;
  }
  const rows = db.prepare('SELECT image, original_image FROM shared_photos WHERE created_at < ?').all(before as string) as any[];
  rows.forEach(r => { deleteFile(r.image); deleteFile(r.original_image); });
  const result = db.prepare('DELETE FROM shared_photos WHERE created_at < ?').run(before as string);
  res.json({ deleted: result.changes });
});

router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const row = db.prepare('SELECT image, original_image FROM shared_photos WHERE id = ?').get(req.params.id) as any;
  if (row) { deleteFile(row.image); deleteFile(row.original_image); }
  db.prepare('DELETE FROM shared_photos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
