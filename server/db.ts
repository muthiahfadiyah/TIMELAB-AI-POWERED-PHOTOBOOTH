// server/db.ts

import BetterSqlite3 from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'photobooth.db');

const db = new BetterSqlite3(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    app_name TEXT NOT NULL DEFAULT 'LUMINA',
    theme TEXT NOT NULL DEFAULT 'frosted',
    logo_url TEXT DEFAULT '',
    footer_text TEXT DEFAULT 'Powered by Generative Neural Networks',
    enable_frame INTEGER DEFAULT 0,
    global_frame_url TEXT DEFAULT '',
    screen_rotation INTEGER DEFAULT 0,
    bg_type TEXT DEFAULT 'video',
    bg_source TEXT DEFAULT '',
    bg_overlay_opacity REAL DEFAULT 0.4
  );

  CREATE TABLE IF NOT EXISTS photo_styles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    preview TEXT NOT NULL,
    asset_image TEXT,
    is_active INTEGER DEFAULT 1,
    gender_target TEXT DEFAULT 'universal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shared_photos (
    id TEXT PRIMARY KEY,
    image TEXT NOT NULL,
    original_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS token_logs (
    id TEXT PRIMARY KEY,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    candidate_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS access_sessions (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    label TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    activated_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ── Migrations ─────────────────────────────────────────────────────────────
try { db.exec(`ALTER TABLE settings ADD COLUMN screen_rotation INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN bg_type TEXT DEFAULT 'video'`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN bg_source TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN bg_overlay_opacity REAL DEFAULT 0.4`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN print_top_logo_url TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN print_thanks_text TEXT DEFAULT 'THANKS FOR COMING'`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN print_quote_text TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN print_footer_logo_url TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN print_footer_text TEXT DEFAULT 'POWERED BY TIMELAB'`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN lobby_badge_text TEXT DEFAULT 'Pengalaman Seni Neural'`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN lobby_heading_text TEXT DEFAULT 'Identitas Baru.'`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN lobby_subtitle_text TEXT DEFAULT 'Wujudkan dirimu dalam tampilan baru. Didukung kecerdasan buatan generatif.'`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN lobby_button_text TEXT DEFAULT 'MULAI SESI'`); } catch {}
try { db.exec(`ALTER TABLE shared_photos ADD COLUMN original_image TEXT`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN favicon_url TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN session_password TEXT DEFAULT ''`); } catch {}
try { db.exec(`ALTER TABLE access_sessions ADD COLUMN activated_at DATETIME DEFAULT NULL`); } catch {}
try { db.exec(`ALTER TABLE settings ADD COLUMN enable_splash INTEGER DEFAULT 1`); } catch {}
try { db.exec(`ALTER TABLE photo_styles ADD COLUMN gender_target TEXT DEFAULT 'universal'`); } catch {}
try { db.exec(`UPDATE photo_styles SET gender_target = 'universal' WHERE gender_target = 'unisex'`); } catch {}
// Alignment of the category selector on the kiosk: 'left' | 'center' | 'right'
try { db.exec(`ALTER TABLE settings ADD COLUMN category_alignment TEXT DEFAULT 'center'`); } catch {}
// Whether generate.ts should append its global face-identity instruction to this style's prompt.
// Default 1 (on) for backwards compat; styles whose own prompt already dictates identity handling
// (e.g. deliberately wants a blank/generic face) can opt out to avoid contradicting instructions.
try { db.exec(`ALTER TABLE photo_styles ADD COLUMN preserve_identity INTEGER DEFAULT 1`); } catch {}
// Whether to show the public header (logo, step nav, session/time badge) on kiosk pages.
try { db.exec(`ALTER TABLE settings ADD COLUMN show_header INTEGER DEFAULT 1`); } catch {}
// Whether to show the top/bottom dark gradient vignette overlay on kiosk background.
try { db.exec(`ALTER TABLE settings ADD COLUMN show_overlay INTEGER DEFAULT 1`); } catch {}
// Whether the kiosk background should blur once the user leaves the lobby step.
try { db.exec(`ALTER TABLE settings ADD COLUMN show_blur INTEGER DEFAULT 1`); } catch {}
// Blur intensity in pixels applied to the kiosk background outside the lobby step.
try { db.exec(`ALTER TABLE settings ADD COLUMN blur_amount INTEGER DEFAULT 40`); } catch {}
// Whether the lobby→style-selection backsound (latarbelakang.mp3) plays on the kiosk.
try { db.exec(`ALTER TABLE settings ADD COLUMN backsound_enabled INTEGER DEFAULT 1`); } catch {}
// Backsound volume, 0-1.
try { db.exec(`ALTER TABLE settings ADD COLUMN backsound_volume REAL DEFAULT 0.3`); } catch {}

// ── Seed default settings row ──────────────────────────────────────────────
const settingsRow = db.prepare('SELECT id FROM settings WHERE id = ?').get('config');
if (!settingsRow) {
  db.prepare(`
    INSERT INTO settings (id, app_name, theme, logo_url, footer_text, enable_frame, global_frame_url)
    VALUES ('config', 'LUMINA', 'frosted', '', 'Powered by Generative Neural Networks', 0, '')
  `).run();
}

// ── Seed default styles ────────────────────────────────────────────────────
const stylesCount = (db.prepare('SELECT COUNT(*) as c FROM photo_styles').get() as any).c;
if (stylesCount === 0) {
  const insertStyle = db.prepare(`
    INSERT INTO photo_styles (id, name, description, prompt, preview, is_active, gender_target)
    VALUES (?, ?, ?, ?, ?, 1, 'universal')
  `);
  const defaultStyles = [
    {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      description: 'Neon lighting, futuristic vibes, and urban grit.',
      preview: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&auto=format&fit=crop',
      prompt: 'Transform this person into a high-quality cyberpunk character, neon blue and pink lighting, futuristic cybernetic details, cinematic urban background, hyperrealistic, 4k.'
    },
    {
      id: 'anime',
      name: 'Anime',
      description: 'Vibrant colors and stylized Japanese art style.',
      preview: 'https://images.unsplash.com/photo-1578632738980-420af542dd3e?w=800&auto=format&fit=crop',
      prompt: 'Redraw this person in a high-quality modern anime style, Makoto Shinkai lighting, vibrant sky background, expressive features, artistic and clean linework.'
    },
    {
      id: 'van-gogh',
      name: 'Oil Painting',
      description: 'Classical textures and rich expressive brushstrokes.',
      preview: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop',
      prompt: 'Transform this portrait into a masterpiece oil painting, thick impasto brushstrokes, rich textures, warm classical palette, museum quality art.'
    }
  ];
  for (const s of defaultStyles) {
    insertStyle.run(s.id, s.name, s.description, s.prompt, s.preview);
  }
  console.log('✅ Default photo styles berhasil di-seed ke database.');
}

export default db;
