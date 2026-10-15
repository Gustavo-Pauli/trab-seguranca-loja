import { randomBytes, randomUUID } from 'node:crypto';
import { open, seal } from '../../../shared/protocol/encryption.js';
import type { Envelope, Payment, PaymentResult } from '../../../shared/protocol/types.js';
import type { Item } from '../../../shared/catalog.js';
import type { Location } from '../../../shared/context/types.js';
import type { SessionUser } from '../auth/session.js';
import { PAYMENT_WINDOW_SECONDS } from '../../../shared/protocol/limits.js';

// Monta a mensagem para o gateway com os itens, o contexto e os dados da sessão.
export function preparePayment(
  user: SessionUser,
  items: Item[],
  cents: number,
  location: Location,
  baseline: Location | null,
): Payment {
  return {
    order_id: `ORD-${randomUUID()}`,
    user_id: user.userId,
    amount: cents / 100,
    amount_cents: cents,
    currency: 'BRL',
    nonce: randomBytes(32).toString('hex'),
    timestamp: Math.floor(Date.now() / 1000),
    items,
    location,
    // Copia da sessão a autenticação que o gateway vai conferir.
    authorization: {
      user_id: user.userId,
      authenticated: true,
      totp_verified: true,
      totp_counter: user.totp_counter,
      issued_at: Math.floor(user.created_at / 1000),
      expires_at: Math.floor(user.expires_at / 1000),
      baseline,
    },
  };
}

export async function sendToGateway(envelope: Envelope, secret: Buffer) {
  const url = process.env.GATEWAY_URL ?? `http://127.0.0.1:${process.env.GATEWAY_PORT ?? 4000}`;

  const response = await fetch(`${url}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(envelope),
    signal: AbortSignal.timeout(10_000),
  });

  const wire: unknown = await response.json();

  if (wire && typeof wire === 'object' && 'version' in wire) {
    const result = await open<PaymentResult>(wire, secret, 'response');

    return { httpStatus: response.status, result, wire, authenticated: true };
  }

  if (response.ok) {
    throw new Error('UNAUTHENTICATED_GATEWAY_RESPONSE');
  }

  return {
    httpStatus: response.status,
    result: wire as PaymentResult,
    wire,
    authenticated: false,
  };
}

// Confere se a resposta é deste pedido e se o horário e o status fazem sentido.
export function verifyGatewayResponse(payment: Payment, result: PaymentResult, httpStatus: number) {
  const belongsToOrder = result?.order_id === payment.order_id && result?.nonce === payment.nonce;

  if (!belongsToOrder) {
    throw new Error('INVALID_GATEWAY_RESPONSE');
  }

  const timestampValid =
    Number.isSafeInteger(result?.timestamp) &&
    Math.abs(result.timestamp - Math.floor(Date.now() / 1000)) <= PAYMENT_WINDOW_SECONDS;

  if (!timestampValid) {
    throw new Error('INVALID_GATEWAY_RESPONSE');
  }

  if (!['APPROVED', 'BLOCKED'].includes(result.status)) {
    throw new Error('INVALID_GATEWAY_RESPONSE');
  }

  if (result.status === 'APPROVED' && httpStatus !== 200) {
    throw new Error('INVALID_GATEWAY_RESPONSE');
  }
}

export async function pay(payment: Payment, secret: Buffer) {
  const envelope = await seal(payment, secret, 'payment');
  const response = await sendToGateway(envelope, secret);

  // O pedido só pode ser confirmado depois de autenticar e conferir a resposta.
  if (!response.authenticated) {
    throw new Error('UNAUTHENTICATED_GATEWAY_RESPONSE');
  }

  verifyGatewayResponse(payment, response.result, response.httpStatus);

  return { envelope, result: response.result };
}
