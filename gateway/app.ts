import express, { type ErrorRequestHandler } from 'express';
import { paymentRoutes } from './modules/payments/payment.routes.js';

export function createGatewayApp(secret: Buffer) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway' }));
  app.use('/payments', paymentRoutes(secret));

  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    console.error('[gateway]', error instanceof Error ? error.message : 'Falha interna');
    res.status(500).json({ status: 'BLOCKED', reason: 'GATEWAY_ERROR' });
  };
  app.use(errors);

  return app;
}
