import type { Request, Response } from 'express';
import { db } from '../../lib/database.js';
import { newToken, digestToken } from './tokens.js';
import { HttpError } from '../../lib/http-error.js';
import type { Location } from '../../../shared/context/types.js';
import { SESSION_LIFETIME_SECONDS } from '../../../shared/protocol/limits.js';

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  created_at: number;
  expires_at: number;
  context_json: string;
  totp_counter: number;
};

const SESSION_MAX_AGE_MS = SESSION_LIFETIME_SECONDS * 1000;

function readSessionToken(req: Request): string | null {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('session='));
  const token = cookie?.slice('session='.length);

  if (!token || !/^[a-f\d]{64}$/.test(token)) {
    return null;
  }

  return token;
}

// Guarda o hash do token no banco e envia o token no cookie.
export function setSession(
  res: Response,
  userId: string,
  location: Location,
  counter: number,
): void {
  const token = newToken();
  const now = Date.now();
  db.prepare(
    `INSERT INTO sessions (token_hash, user_id, created_at, expires_at, context_json, totp_counter)
    VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    digestToken(token),
    userId,
    now,
    now + SESSION_MAX_AGE_MS,
    JSON.stringify(location),
    counter,
  );
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

// Busca a sessão pelo cookie; retorna null se ela não existir ou não for válida.
export function readSession(req: Request): SessionUser | null {
  const token = readSessionToken(req);

  if (!token) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT u.id AS userId, u.name, u.email, s.created_at, s.expires_at, s.context_json, s.totp_counter
    FROM sessions s INNER JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.totp_enabled = 1
      AND s.context_json IS NOT NULL AND s.totp_counter IS NOT NULL`,
    )
    .get(digestToken(token), Date.now());

  return (row as SessionUser | undefined) ?? null;
}

export function requireSession(req: Request): SessionUser {
  const user = readSession(req);

  if (!user) {
    throw new HttpError(401, 'Entre na sua conta.');
  }

  return user;
}

export function revokeSession(req: Request, res: Response) {
  const token = readSessionToken(req);

  if (token) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digestToken(token));
  }

  res.clearCookie('session', { path: '/' });
}

export function cleanSessions(now: number) {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
}
