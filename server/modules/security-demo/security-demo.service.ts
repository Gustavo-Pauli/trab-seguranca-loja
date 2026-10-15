import { randomBytes, randomUUID } from 'node:crypto';
import { HttpError } from '../../lib/http-error.js';
import { seal } from '../../../shared/protocol/encryption.js';
import type { Envelope, Payment } from '../../../shared/protocol/types.js';
import { sendToGateway } from '../payments/payment.service.js';
import { captureFor } from './captures.js';

export function getCapture(userId: string) {
  const capture = captureFor(userId);

  if (!capture) {
    throw new HttpError(404, 'Faça uma compra aprovada primeiro.');
  }

  return {
    envelope: capture.envelope,
    amount: capture.payment.amount,
    order_id: capture.payment.order_id,
  };
}

// Tenta mudar R$ 100 para R$ 1000 alterando apenas o texto cifrado.
function tamperAmount(payment: Payment, envelope: Envelope) {
  if (payment.amount !== 100) {
    throw new HttpError(400, 'Compre 2 cadernos (R$ 100) para este exemplo.');
  }

  // Troca os bytes de 100 por 1e3 (1000), mantendo o tamanho e a tag originais.
  const plaintext = Buffer.from(JSON.stringify(payment));
  const offset = plaintext.indexOf('"amount":100') + Buffer.byteLength('"amount":');
  const bytes = Buffer.from(envelope.ciphertext, 'base64');
  const original = Buffer.from('100');
  const target = Buffer.from('1e3');

  for (let i = 0; i < 3; i++) {
    bytes[offset + i] ^= original[i] ^ target[i];
  }

  return {
    envelope: { ...envelope, ciphertext: bytes.toString('base64') },
    modification: { from: 100, attempted: 1000, encoding: '1e3', offset, tagUnchanged: true },
  };
}

export async function runAttack(userId: string, action: unknown, secret: Buffer) {
  const capture = captureFor(userId);

  if (!capture) {
    throw new HttpError(400, 'Faça uma compra aprovada primeiro.');
  }

  let envelope = { ...capture.envelope };
  let modification: unknown = null;

  if (action === 'tamper') {
    ({ envelope, modification } = tamperAmount(capture.payment, envelope));
  } else if (action === 'expired' || action === 'inconsistent') {
    const payment = structuredClone(capture.payment);
    payment.nonce = randomBytes(32).toString('hex');
    payment.order_id = `ORD-${randomUUID()}`;

    if (action === 'expired') {
      payment.timestamp -= 300;
    } else {
      payment.amount = 1000;
      payment.amount_cents = 100000;
    }

    // Recifra o pedido alterado para testar timestamp e valor com uma tag válida.
    envelope = await seal(payment, secret, 'payment');
  } else if (action !== 'replay') {
    throw new HttpError(400, 'Teste inválido.');
  }

  const response = await sendToGateway(envelope, secret);

  return { action, modification, request: envelope, response };
}
