import { locate } from '../../../shared/context/ip2location.js';
import { decide } from '../../../shared/context/policy.js';
import { orderItems, totalCents } from '../../../shared/catalog.js';
import type { Payment } from '../../../shared/protocol/types.js';

/** Executada somente depois de open() autenticar a mensagem da loja. */
export function validatePayment(payment: Payment, now: number): string | null {
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
    !Number.isSafeInteger(payment.timestamp) || Math.abs(now - payment.timestamp) > 120;
  if (invalidTimestamp) {
    return 'INVALID_TIMESTAMP';
  }

  const authorization = payment.authorization;
  if (!authorization) {
    return 'UNAUTHENTICATED';
  }

  const invalidSession =
    authorization.authenticated !== true || authorization.user_id !== payment.user_id;
  const invalidSessionTime =
    !Number.isSafeInteger(authorization.issued_at) ||
    !Number.isSafeInteger(authorization.expires_at) ||
    authorization.issued_at > now ||
    authorization.expires_at <= now ||
    authorization.expires_at <= authorization.issued_at ||
    authorization.expires_at - authorization.issued_at > 12 * 3600;
  if (invalidSession || invalidSessionTime) {
    return 'UNAUTHENTICATED';
  }

  // A loja atesta a 2FA; o gateway não recebe o segredo TOTP do usuário.
  const expectedCounter = Math.floor(authorization.issued_at / 30);
  const invalidTotpProof =
    authorization.totp_verified !== true ||
    !Number.isSafeInteger(authorization.totp_counter) ||
    Math.abs(authorization.totp_counter - expectedCounter) > 1;
  if (invalidTotpProof) {
    return 'INVALID_TOTP';
  }

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

  if (!payment.location || !['socket', 'server-demo'].includes(payment.location.source)) {
    return 'INVALID_CONTEXT';
  }
  const freshLocation = locate(payment.location.ip, payment.location.source);
  if (JSON.stringify(freshLocation) !== JSON.stringify(payment.location)) {
    return 'INVALID_CONTEXT';
  }
  const decision = decide(freshLocation, authorization.baseline);
  if (!decision.allowed) {
    return decision.reason;
  }
  return null;
}
