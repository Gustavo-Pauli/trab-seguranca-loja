import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { demoMode } from '../shared/context/config.js';
import { checkApiRequest } from './lib/api-middleware.js';
import { handleError } from './lib/error-handler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { contextRoutes } from './modules/context/context.routes.js';
import { ordersRoutes } from './modules/orders/orders.routes.js';
import { securityDemoRoutes } from './modules/security-demo/security-demo.routes.js';

export function createShopApp(secret: Buffer) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use('/api', checkApiRequest);
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'shop', demoMode }));
  app.use('/api/auth', authRoutes);
  app.use('/api/products', catalogRoutes);
  app.use('/api/context', contextRoutes);
  app.use('/api', ordersRoutes(secret));
  if (demoMode) {
    app.use('/api/demo', securityDemoRoutes(secret));
  }
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint não encontrado.' }));
  const buildPath = resolve('dist');
  if (existsSync(buildPath)) {
    app.use(express.static(buildPath));
    app.get('/{*path}', (_req, res) => res.sendFile('index.html', { root: buildPath }));
  }
  app.use(handleError);
  return app;
}
