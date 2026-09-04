// server/index.ts

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import stylesRoutes from './routes/styles.js';
import photosRoutes from './routes/photos.js';
import usersRoutes from './routes/users.js';
import tokensRoutes from './routes/tokens.js';
import generateRoutes from './routes/generate.js';
import sessionsRoutes from './routes/sessions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOADS_DIR = join(__dirname, '..', 'uploads');
mkdirSync(join(UPLOADS_DIR, 'photos'), { recursive: true });

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// CORS_ORIGIN: comma-separated list of allowed origins for production
// (e.g. "https://photobooth.example.com"). Defaults to the local Vite
// dev server so `npm run dev` keeps working out of the box.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet({
  contentSecurityPolicy: false, // this server only serves the API + /uploads, not HTML
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // frontend may be on a different origin
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/styles', stylesRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/sessions', sessionsRoutes);

app.listen(PORT, () => {
  console.log(`\n✅ Backend server berjalan di http://localhost:${PORT}`);
  console.log(`   Database: photobooth.db (SQLite lokal)\n`);
});
