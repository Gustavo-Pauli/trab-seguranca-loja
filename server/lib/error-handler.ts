import type { ErrorRequestHandler } from 'express';
import { HttpError } from './http-error.js';

export const handleError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof HttpError) {
    res
      .status(error.status)
      .json({ error: error.message, ...(error.reason ? { reason: error.reason } : {}) });

    return;
  }

  const status = (error as { status?: number })?.status;

  if (status === 400 || status === 413) {
    const message = status === 413 ? 'Requisição muito grande.' : 'JSON inválido.';
    res.status(status).json({ error: message });

    return;
  }

  const message = error instanceof Error ? error.message : 'erro desconhecido';
  console.error('[servidor] Falha inesperada:', message);
  res.status(500).json({ error: 'Erro interno do servidor.' });
};
