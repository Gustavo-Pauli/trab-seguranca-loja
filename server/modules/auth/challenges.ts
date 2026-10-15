import { newToken, digestToken } from './tokens.js';
import { HttpError } from '../../lib/http-error.js';

type Challenge = {
  userId: string;
  secret: string;
  kind: 'enroll' | 'login';
  expiresAt: number;
  attempts: number;
  ip: string;
};

// Só desafios temporários: a semente persistida permanece cifrada no SQLite.
const challenges = new Map<string, Challenge>();
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function newChallenge(userId: string, secret: string, kind: Challenge['kind'], ip: string) {
  const token = newToken();
  challenges.set(digestToken(token), {
    userId,
    secret,
    kind,
    ip,
    expiresAt: Date.now() + 5 * 60_000,
    attempts: 0,
  });
  return token;
}

export function takeAttempt(token: string): Challenge {
  const key = digestToken(token);
  const challenge = challenges.get(key);
  if (!challenge || challenge.expiresAt < Date.now() || challenge.attempts >= 5) {
    challenges.delete(key);
    throw new HttpError(401, 'Desafio expirado. Faça login novamente.');
  }
  challenge.attempts += 1;
  return challenge;
}

export function discardChallenge(token: string) {
  challenges.delete(digestToken(token));
}

export function discardUserChallenges(userId: string) {
  for (const [key, pending] of challenges) {
    if (pending.userId === userId) {
      challenges.delete(key);
    }
  }
}

export function checkLoginRateLimit(key: string): void {
  const now = Date.now();
  const info = loginAttempts.get(key);
  if (!info || info.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return;
  }
  info.count += 1;
  if (info.count > 8) {
    throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  }
}

export function cleanChallenges(now: number) {
  for (const [key, challenge] of challenges) {
    if (challenge.expiresAt < now) {
      challenges.delete(key);
    }
  }
  for (const [key, attempt] of loginAttempts) {
    if (attempt.resetAt < now) {
      loginAttempts.delete(key);
    }
  }
}
