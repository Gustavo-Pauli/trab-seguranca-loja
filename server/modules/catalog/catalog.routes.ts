import { Router } from 'express';
import { products } from '../../../shared/catalog.js';
import { requireSession } from '../auth/session.js';

export const catalogRoutes = Router();

catalogRoutes.get('/', (req, res) => {
  requireSession(req);
  res.json({ products });
});
