import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = resolve(process.env.DATA_DIR ?? '.data');
mkdirSync(directory, { recursive: true });
export const db = new Database(resolve(directory, 'gateway.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.exec(`CREATE TABLE IF NOT EXISTS nonces (nonce TEXT PRIMARY KEY, used_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS payments (
    order_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    approved_at INTEGER NOT NULL
  );`);
