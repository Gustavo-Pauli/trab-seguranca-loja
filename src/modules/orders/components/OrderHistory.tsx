import { useEffect, useState } from 'react';
import { fetchOrders } from '../api';
import type { Order } from '../types';
import { errorMessage, formatMoney } from '../../../lib/api';

const labels = {
  APPROVED: 'Aprovado',
  BLOCKED: 'Bloqueado',
  ERROR: 'Não confirmado',
  PENDING: 'Em análise',
};
export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchOrders()
      .then((history) => {
        if (active) setOrders(history);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="orders" aria-label="Meus pedidos">
      {loading && <p role="status">Carregando…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && orders.length === 0 && <p className="muted">Nenhum pedido ainda.</p>}
      {orders.map((order) => (
        <div className="order-row" key={order.id}>
          <div>
            <span>Pedido {order.id.slice(4, 12).toUpperCase()}</span>
            <small>{new Date(order.created_at).toLocaleString('pt-BR')}</small>
          </div>
          <span className={`order-status ${order.status.toLowerCase()}`}>
            {labels[order.status]}
          </span>
          <strong>{formatMoney(order.total_cents)}</strong>
        </div>
      ))}
    </section>
  );
}
