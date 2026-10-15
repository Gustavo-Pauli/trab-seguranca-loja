import { db } from '../../lib/database.js';
import type { Payment } from '../../../shared/protocol/types.js';

// Reserva o nonce e grava o pagamento na mesma transação SQLite.
export const acceptOnce = db.transaction((p: Payment, now: number): string | null => {
  if (db.prepare('SELECT 1 FROM nonces WHERE nonce = ?').get(p.nonce)) {
    return 'INVALID_NONCE';
  }

  db.prepare('INSERT INTO nonces (nonce, used_at) VALUES (?, ?)').run(p.nonce, now);

  if (db.prepare('SELECT 1 FROM payments WHERE order_id = ?').get(p.order_id)) {
    return 'ORDER_ALREADY_PAID';
  }

  db.prepare('INSERT INTO payments VALUES (?, ?, ?, ?)').run(
    p.order_id,
    p.user_id,
    p.amount_cents,
    now,
  );

  return null;
});
