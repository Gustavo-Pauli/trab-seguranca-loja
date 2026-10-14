import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve(process.env.DATA_DIR ?? '.data');
mkdirSync(directory, { recursive: true });
export const db = new Database(resolve(directory, 'loja.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  totp_salt TEXT NOT NULL,
  totp_ciphertext TEXT NOT NULL,
  totp_tag TEXT NOT NULL,
  totp_enabled INTEGER NOT NULL DEFAULT 0,
  totp_last_counter INTEGER NOT NULL DEFAULT -1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE TABLE IF NOT EXISTS access_contexts (
  user_id TEXT PRIMARY KEY REFERENCES users(id), location_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  items_json TEXT NOT NULL, total_cents INTEGER NOT NULL CHECK(total_cents > 0),
  status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','BLOCKED','ERROR')),
  reason TEXT, created_at INTEGER NOT NULL
);
`);

// Migração aditiva e idempotente; não apaga cadastros da etapa anterior.
const columns = db.prepare('PRAGMA table_info(sessions)').all() as { name: string }[];
if (!columns.some((c) => c.name === 'context_json'))
  db.exec('ALTER TABLE sessions ADD COLUMN context_json TEXT');
if (!columns.some((c) => c.name === 'totp_counter'))
  db.exec('ALTER TABLE sessions ADD COLUMN totp_counter INTEGER');
