import { Router } from 'express';
import { requireSession } from '../auth/session.js';
import { requestLocation } from './context.service.js';
import { baselineFor } from './context.repository.js';
import { decide } from '../../../shared/context/policy.js';

export const contextRoutes = Router();

contextRoutes.post('/', (req, res) => {
  const user = requireSession(req);
  const observed = requestLocation(req);
  res.json({
    clientDeclarationIgnored: true,
    observed,
    decision: decide(observed, baselineFor(user.userId)),
  });
});
