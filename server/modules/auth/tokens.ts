import { randomBytes, createHash } from 'node:crypto';
export function newToken(): string {
  return randomBytes(32).toString('hex');
}
export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
