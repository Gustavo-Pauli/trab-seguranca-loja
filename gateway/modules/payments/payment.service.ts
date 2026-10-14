import { open, seal } from '../../../shared/protocol/encryption.js';
import type { Payment, PaymentResult } from '../../../shared/protocol/types.js';
import { validatePayment } from './payment.validation.js';
import { acceptOnce } from '../replay/nonce.repository.js';

export async function processPayment(input: unknown, secret: Buffer) {
  let payment: Payment;
  try {
    payment = await open<Payment>(input, secret, 'payment');
  } catch {
    return { httpStatus: 400, body: { status: 'BLOCKED', reason: 'INVALID_AUTH_TAG' } };
  }
  const now = Math.floor(Date.now() / 1000);
  const reason = validatePayment(payment, now) ?? acceptOnce(payment, now);
  const result: PaymentResult = {
    order_id: typeof payment?.order_id === 'string' ? payment.order_id : null,
    nonce: typeof payment?.nonce === 'string' ? payment.nonce : null,
    status: reason ? 'BLOCKED' : 'APPROVED',
    timestamp: now,
    ...(reason ? { reason } : {}),
  };
  console.log(`[gateway] ${result.order_id ?? '-'} ${result.status}${reason ? ` ${reason}` : ''}`);
  return { httpStatus: reason ? 409 : 200, body: await seal(result, secret, 'response') };
}
