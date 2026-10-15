import { randomBytes, randomUUID } from 'node:crypto';
import { open, seal } from '../../../shared/protocol/encryption.js';
import type { Envelope, Payment, PaymentResult } from '../../../shared/protocol/types.js';
import type { Item } from '../../../shared/catalog.js';
import type { Location } from '../../../shared/context/types.js';
import type { SessionUser } from '../auth/session.js';

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
    // Essa atestação vem da sessão validada pelo servidor, nunca do body do navegador.
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
  let result: PaymentResult;
  let authenticated = false;
  if (wire && typeof wire === 'object' && 'version' in wire) {
    result = await open<PaymentResult>(wire, secret, 'response');
    authenticated = true;
  } else if (response.ok) {
    throw new Error('UNAUTHENTICATED_GATEWAY_RESPONSE');
  } else {
    result = wire as PaymentResult; // Só a demonstração exibe erros em claro, sem confirmar pedidos.
  }
  return { httpStatus: response.status, result, wire, authenticated };
}

// Vincula a resposta autenticada ao pedido enviado.
export function verifyGatewayResponse(payment: Payment, result: PaymentResult, httpStatus: number) {
  const matchesRequest = result?.order_id === payment.order_id && result?.nonce === payment.nonce;
  const validTimestamp =
    Number.isSafeInteger(result?.timestamp) &&
    Math.abs(result.timestamp - Math.floor(Date.now() / 1000)) <= 120;
  const validStatus = result && ['APPROVED', 'BLOCKED'].includes(result.status);
  const approvalConfirmed = result?.status !== 'APPROVED' || httpStatus === 200;
  if (!matchesRequest || !validTimestamp || !validStatus || !approvalConfirmed) {
    throw new Error('INVALID_GATEWAY_RESPONSE');
  }
}

export async function pay(payment: Payment, secret: Buffer) {
  const envelope = await seal(payment, secret, 'payment');
  const response = await sendToGateway(envelope, secret);
  if (!response.authenticated) {
    throw new Error('UNAUTHENTICATED_GATEWAY_RESPONSE');
  }
  verifyGatewayResponse(payment, response.result, response.httpStatus);
  return { envelope, result: response.result };
}
