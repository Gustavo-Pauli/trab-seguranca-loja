import { db } from '../../lib/database.js';
import type { Payment, PaymentResult } from '../../../shared/protocol/types.js';

type StoredOrder = {
  id: string;
  user_id: string;
  items_json: string;
  total_cents: number;
  status: 'PENDING' | 'APPROVED' | 'BLOCKED' | 'ERROR';
  reason: string | null;
  created_at: number;
};

export function listOrders(userId: string) {
  const rows = db
    .prepare(
      `SELECT id, user_id, items_json, total_cents, status, reason, created_at
  FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    )
    .all(userId) as StoredOrder[];
  return rows.map(({ items_json, ...order }) => ({
    ...order,
    order_id: order.id,
    total: order.total_cents / 100,
    items: JSON.parse(items_json),
  }));
}

export function insertPendingOrder(payment: Payment) {
  db.prepare("INSERT INTO orders VALUES (?, ?, ?, ?, 'PENDING', NULL, ?)").run(
    payment.order_id,
    payment.user_id,
    JSON.stringify(payment.items),
    payment.amount_cents,
    Date.now(),
  );
}

export function confirmOrder(orderId: string, result: PaymentResult) {
  db.prepare('UPDATE orders SET status = ?, reason = ? WHERE id = ?').run(
    result.status,
    result.reason ?? null,
    orderId,
  );
}

export function markUnconfirmed(orderId: string) {
  db.prepare("UPDATE orders SET status = 'ERROR', reason = 'GATEWAY_UNAVAILABLE' WHERE id = ?").run(
    orderId,
  );
}
