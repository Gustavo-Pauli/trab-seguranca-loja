import { HttpError } from '../../lib/http-error.js';
import { decide } from '../../../shared/context/policy.js';
import { orderItems, totalCents } from '../../../shared/catalog.js';
import type { Location } from '../../../shared/context/types.js';
import type { SessionUser } from '../auth/session.js';
import { baselineFor } from '../context/context.repository.js';
import { preparePayment, pay } from '../payments/payment.service.js';
import { insertPendingOrder, confirmOrder, markUnconfirmed } from './orders.repository.js';
import { rememberCapture } from '../security-demo/captures.js';
import type { Payment } from '../../../shared/protocol/types.js';

export async function checkout(
  user: SessionUser,
  input: unknown,
  location: Location,
  secret: Buffer,
) {
  const baseline = validateCheckoutContext(user, location);
  const items = readOrderItems(input);
  const payment = preparePayment(user, items, totalCents(items), location, baseline);
  insertPendingOrder(payment);

  return payAndConfirmOrder(user.userId, payment, secret);
}

// Confere o contexto atual e se o IP continua sendo o mesmo do login.
function validateCheckoutContext(user: SessionUser, location: Location) {
  const baseline = baselineFor(user.userId);
  const decision = decide(location, baseline);
  const loginLocation = JSON.parse(user.context_json) as Location;

  if (!decision.allowed || loginLocation.ip !== location.ip) {
    throw new HttpError(
      403,
      'Seu contexto de acesso mudou. Entre novamente.',
      decision.allowed ? 'SESSION_CONTEXT_CHANGED' : decision.reason,
    );
  }

  return baseline;
}

// Valida o carrinho e devolve os itens com os preços do catálogo.
function readOrderItems(input: unknown) {
  try {
    return orderItems(input);
  } catch {
    throw new HttpError(400, 'Confira os produtos e as quantidades.', 'INVALID_ITEMS');
  }
}

// Envia ao gateway e atualiza o pedido; sem confirmação, deixa o status como ERROR.
async function payAndConfirmOrder(userId: string, payment: Payment, secret: Buffer) {
  try {
    const { envelope, result } = await pay(payment, secret);
    confirmOrder(payment.order_id, result);

    if (result.status === 'APPROVED') {
      rememberCapture(userId, payment, envelope);
    }

    return {
      httpStatus: result.status === 'APPROVED' ? 200 : 409,
      body: { ...result, total_cents: payment.amount_cents },
    };
  } catch (error) {
    console.error('[pagamento]', error instanceof Error ? error.message : 'Gateway indisponível');
    markUnconfirmed(payment.order_id);

    return {
      httpStatus: 502,
      body: {
        error:
          'Não foi possível confirmar o pagamento. Confira seus pedidos antes de tentar novamente.',
        order_id: payment.order_id,
        status: 'ERROR',
        reason: 'GATEWAY_UNAVAILABLE',
      },
    };
  }
}
