import { Router } from 'express';
import { HttpError } from '../../lib/http-error.js';
import { demoMode } from '../../../shared/context/config.js';
import { requestLocation } from '../context/context.service.js';
import { registerUser, loginWithPassword } from './auth.service.js';
import { verifySecondFactor } from './second-factor.service.js';
import { checkLoginRateLimit, cleanChallenges } from './challenges.js';
import { requireSession, setSession, revokeSession, cleanSessions } from './session.js';

export const authRoutes = Router();

authRoutes.post('/register', async (req, res) => {
  checkLoginRateLimit(`register:${req.socket.remoteAddress}`);

  const { name, email, password } = req.body ?? {};

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'Preencha nome, e-mail e senha.');
  }

  const challenge = await registerUser(name, email, password, requestLocation(req).ip);
  res.status(201).json(challenge);
});
authRoutes.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    email.length > 254 ||
    password.length > 128
  ) {
    throw new HttpError(400, 'Informe e-mail e senha.');
  }

  checkLoginRateLimit(`${req.socket.remoteAddress ?? 'unknown'}:${email.trim().toLowerCase()}`);
  res.json(await loginWithPassword(email, password, requestLocation(req).ip));
});
authRoutes.post('/verify-totp', (req, res) => {
  const { challengeToken, code } = req.body ?? {};

  if (
    typeof challengeToken !== 'string' ||
    !/^[a-f\d]{64}$/.test(challengeToken) ||
    typeof code !== 'string'
  ) {
    throw new HttpError(400, 'Desafio ou código inválido.');
  }

  const location = requestLocation(req);
  const { user, counter, decision } = verifySecondFactor(challengeToken, code, location);
  setSession(res, user.id, location, counter);
  res.json({ ok: true, user, context: decision });
});
authRoutes.get('/me', (req, res) => {
  const user = requireSession(req);
  res.json({ user: { id: user.userId, name: user.name, email: user.email }, demoMode });
});
authRoutes.post('/logout', (req, res) => {
  revokeSession(req, res);
  res.json({ ok: true });
});

setInterval(() => {
  const now = Date.now();
  cleanChallenges(now);
  cleanSessions(now);
}, 60_000).unref();
