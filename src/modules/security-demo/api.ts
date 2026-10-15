import { request } from '../../lib/api';
import type { AuthChallenge } from '../auth/types';
import type { Evidence } from './types';

export async function runAttackRequest(action: string): Promise<Evidence> {
  const route = action === 'location' ? '/context' : '/demo/attack';
  const body =
    action === 'location'
      ? { ip: '8.8.8.8', location: { country: 'XX', region: 'Falsa', city: 'Inventada' } }
      : { action };
  const response = await request(route, body);
  return {
    route: `/api${route}`,
    httpStatus: response.httpStatus,
    result: response.data,
    submitted: body,
  };
}

export async function testTotpRequest(
  email: string,
  password: string,
  code: string,
): Promise<Evidence> {
  const login = await request<AuthChallenge>('/auth/login', { email, password });
  if (!login.ok) {
    return { route: '/api/auth/login', httpStatus: login.httpStatus, result: login.data };
  }
  const response = await request('/auth/verify-totp', {
    challengeToken: login.data.challengeToken,
    code,
  });
  // Não exibir senha, token de desafio ou semente na evidência.
  return {
    route: '/api/auth/verify-totp',
    httpStatus: response.httpStatus,
    result: response.data,
    submitted: { code },
  };
}
