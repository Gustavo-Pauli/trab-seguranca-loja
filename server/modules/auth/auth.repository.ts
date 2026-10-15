import { db } from '../../lib/database.js';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_salt: string;
  password_hash: string;
  totp_salt: string;
  totp_ciphertext: string;
  totp_tag: string;
  totp_enabled: number;
  totp_last_counter: number;
  created_at: number;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function insertUser(user: UserRow): void {
  db.prepare(
    `INSERT INTO users (
    id, name, email, password_salt, password_hash, totp_salt, totp_ciphertext, totp_tag,
    totp_enabled, totp_last_counter, created_at
  ) VALUES (
    @id, @name, @email, @password_salt, @password_hash, @totp_salt, @totp_ciphertext,
    @totp_tag, @totp_enabled, @totp_last_counter, @created_at
  )`,
  ).run(user);
}

export function useTotpCounter(userId: string, counter: number): boolean {
  // O UPDATE só avança o contador; duas tentativas com o mesmo código não passam juntas.
  const result = db
    .prepare(
      `UPDATE users
    SET totp_enabled = 1, totp_last_counter = ?
    WHERE id = ? AND totp_last_counter < ?`,
    )
    .run(counter, userId, counter);

  return result.changes === 1;
}
