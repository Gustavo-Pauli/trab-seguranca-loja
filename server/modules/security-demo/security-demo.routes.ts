import { Router } from 'express';
import { requireSession } from '../auth/session.js';
import { getCapture, runAttack } from './security-demo.service.js';

export function securityDemoRoutes(secret: Buffer) {
  const router = Router();
  router.get('/capture', (req, res) => res.json(getCapture(requireSession(req).userId)));
  router.post('/attack', async (req, res) => {
    res.json(await runAttack(requireSession(req).userId, req.body?.action, secret));
  });

  return router;
}
