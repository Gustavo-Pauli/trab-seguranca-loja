import { Router } from 'express';
import { requireSession } from '../auth/session.js';
import { requestLocation } from '../context/context.service.js';
import { listOrders } from './orders.repository.js';
import { checkout } from './orders.service.js';

export function ordersRoutes(secret: Buffer) {
  const router = Router();
  router.get('/orders', (req, res) => res.json({ orders: listOrders(requireSession(req).userId) }));
  router.post('/checkout', async (req, res) => {
    const { httpStatus, body } = await checkout(
      requireSession(req),
      req.body?.items,
      requestLocation(req),
      secret,
    );
    res.status(httpStatus).json(body);
  });
  return router;
}
