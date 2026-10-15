import type { RequestHandler } from 'express';

const port = Number(process.env.PORT ?? 3001);

export const checkApiRequest: RequestHandler = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const origins = [5173, port].flatMap((allowedPort) => [
    `http://127.0.0.1:${allowedPort}`,
    `http://localhost:${allowedPort}`,
  ]);
  const crossSite = req.headers['sec-fetch-site'] === 'cross-site';
  const originDenied = req.headers.origin && !origins.includes(req.headers.origin);

  // JSON e origem permitida dificultam submissões de outros sites com o cookie da loja.
  if (req.method === 'POST' && (crossSite || originDenied)) {
    res.status(403).json({ error: 'Origem não permitida.' });
    return;
  }
  if (req.method === 'POST' && !req.is('application/json')) {
    res.status(415).json({ error: 'Envie JSON.' });
    return;
  }
  next();
};
