import { Router } from 'express';
import { processPayment } from './payment.service.js';

export function paymentRoutes(secret: Buffer) {
  const router = Router();
  router.post('/', async (req, res) => {
    const { httpStatus, body } = await processPayment(req.body, secret);
    res.status(httpStatus).json(body);
  });

  return router;
}
