import { locate } from '../../../shared/context/ip2location.js';
import { decide } from '../../../shared/context/policy.js';
import { orderItems, totalCents } from '../../../shared/catalog.js';
import type { Payment } from '../../../shared/protocol/types.js';
import {
  PAYMENT_WINDOW_SECONDS,
  SESSION_LIFETIME_SECONDS,
  TOTP_PERIOD_SECONDS,
} from '../../../shared/protocol/limits.js';

const TOTP_COUNTER_WINDOW = 1;

// Retorna o primeiro motivo de bloqueio, ou null se estiver tudo certo.
export function validatePayment(payment: Payment, now: number): string | null {
  const messageError = validateMessage(payment, now);

  if (messageError) {
    return messageError;
  }

  const authorizationError = validateAuthorization(payment, now);

  if (authorizationError) {
    return authorizationError;
  }

  const orderError = validateOrder(payment);

  if (orderError) {
    return orderError;
  }

  return validateContext(payment);
}

// Confere o formato dos IDs e do nonce, e se o timestamp está dentro da janela.
function validateMessage(payment: Payment, now: number): string | null {
  if (!payment || typeof payment !== 'object') {
    return 'INVALID_MESSAGE';
  }

  const invalidOrderId =
    typeof payment.order_id !== 'string' || !/^ORD-[a-f\d-]{36}$/.test(payment.order_id);
  const invalidUserId =
    typeof payment.user_id !== 'string' || !/^[a-f\d-]{36}$/.test(payment.user_id);
  const invalidNonce = typeof payment.nonce !== 'string' || !/^[a-f\d]{64}$/.test(payment.nonce);

  if (invalidOrderId || invalidUserId || invalidNonce) {
    return 'INVALID_MESSAGE';
  }

  const invalidTimestamp =
    !Number.isSafeInteger(payment.timestamp) ||
    Math.abs(now - payment.timestamp) > PAYMENT_WINDOW_SECONDS;

  if (invalidTimestamp) {
    return 'INVALID_TIMESTAMP';
  }

  return null;
}

// Confere a sessão e a confirmação de TOTP enviadas pela loja.
function validateAuthorization(payment: Payment, now: number): string | null {
  const authorization = payment.authorization;

  if (!authorization) {
    return 'UNAUTHENTICATED';
  }

  if (authorization.authenticated !== true || authorization.user_id !== payment.user_id) {
    return 'UNAUTHENTICATED';
  }

  const issuedAt = authorization.issued_at;
  const expiresAt = authorization.expires_at;

  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) {
    return 'UNAUTHENTICATED';
  }

  const sessionNotStarted = issuedAt > now;
  const sessionExpired = expiresAt <= now;
  const invalidDuration = expiresAt <= issuedAt || expiresAt - issuedAt > SESSION_LIFETIME_SECONDS;

  if (sessionNotStarted || sessionExpired || invalidDuration) {
    return 'UNAUTHENTICATED';
  }

  // Confere a declaração de 2FA da loja usando o horário de criação da sessão.
  const expectedCounter = Math.floor(issuedAt / TOTP_PERIOD_SECONDS);
  const invalidTotpProof =
    authorization.totp_verified !== true ||
    !Number.isSafeInteger(authorization.totp_counter) ||
    Math.abs(authorization.totp_counter - expectedCounter) > TOTP_COUNTER_WINDOW;

  if (invalidTotpProof) {
    return 'INVALID_TOTP';
  }

  return null;
}

// Refaz os preços e o total usando o catálogo, para comparar com o pedido recebido.
function validateOrder(payment: Payment): string | null {
  const invalidAmount =
    payment.currency !== 'BRL' ||
    !Number.isSafeInteger(payment.amount_cents) ||
    payment.amount_cents <= 0 ||
    payment.amount !== payment.amount_cents / 100;

  if (invalidAmount) {
    return 'INVALID_AMOUNT';
  }

  try {
    const expectedItems = orderItems(payment.items);
    const wrongPrices = expectedItems.some((item, index) => {
      const received = payment.items[index];

      return (
        item.unit_price !== received.unit_price ||
        item.unit_price_cents !== received.unit_price_cents
      );
    });
    const wrongTotal = totalCents(expectedItems) !== payment.amount_cents;

    if (wrongPrices || wrongTotal) {
      return 'INCONSISTENT_ORDER';
    }
  } catch {
    return 'INCONSISTENT_ORDER';
  }

  return null;
}

// Consulta o IP de novo na DB5 e aplica a política de contexto.
function validateContext(payment: Payment): string | null {
  if (!payment.location || !['socket', 'server-demo'].includes(payment.location.source)) {
    return 'INVALID_CONTEXT';
  }

  const freshLocation = locate(payment.location.ip, payment.location.source);

  if (JSON.stringify(freshLocation) !== JSON.stringify(payment.location)) {
    return 'INVALID_CONTEXT';
  }

  const decision = decide(freshLocation, payment.authorization.baseline);

  if (!decision.allowed) {
    return decision.reason;
  }

  return null;
}
