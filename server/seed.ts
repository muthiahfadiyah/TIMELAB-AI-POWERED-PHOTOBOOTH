// server/seed.ts

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import db from './db.js';

const email = process.argv[2] || 'admin@photobooth.local';
const password = process.argv[3] || 'admin123';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  console.log(`\n⚠️  User dengan email "${email}" sudah ada.\n`);
  process.exit(0);
}

const id = randomUUID();
const hash = bcrypt.hashSync(password, 10);
const displayName = email.split('@')[0];

db.prepare('INSERT INTO users (id, email, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)')
  .run(id, email, hash, 'admin', displayName);

console.log(`
✅ Admin berhasil dibuat!
   Email    : ${email}
   Password : ${password}
   Role     : admin

   Login di: http://localhost:3000/logTime/login
`);
