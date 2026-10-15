import { api } from '../../lib/api';
import type { AuthChallenge, User } from './types';

export function register(name: string, email: string, password: string) {
  return api<AuthChallenge>('/auth/register', { name, email, password });
}

export function login(email: string, password: string) {
  return api<AuthChallenge>('/auth/login', { email, password });
}

export function confirmTotp(challengeToken: string, code: string) {
  return api<{ user: User }>('/auth/verify-totp', { challengeToken, code });
}
