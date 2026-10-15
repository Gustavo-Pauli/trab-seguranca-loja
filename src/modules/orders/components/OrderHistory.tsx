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
const statusColors = {
  APPROVED: 'text-green-700',
  BLOCKED: 'text-red-700',
  ERROR: 'text-red-700',
  PENDING: 'text-zinc-500',
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
    <section
      className="mt-9 rounded-[9px] border border-zinc-200 bg-white p-[22px] max-tablet:p-[18px]"
      aria-label="Meus pedidos"
    >
      {loading && <p role="status">Carregando…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && orders.length === 0 && (
        <p className="text-zinc-500">Nenhum pedido ainda.</p>
      )}
      {orders.map((order) => (
        <div
          className="grid grid-cols-[1fr_auto_100px] items-center gap-4 border-b border-zinc-100 py-4 text-xs
          last:border-0 last:pb-0 max-tablet:grid-cols-[1fr_auto] max-tablet:gap-2"
          key={order.id}
        >
          <div>
            <span>Pedido {order.id.slice(4, 12).toUpperCase()}</span>
            <small className="mt-[3px] block text-[11px] text-zinc-500">
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </small>
          </div>
          <span
            className={`text-[11px] max-tablet:col-start-1 max-tablet:row-start-2
              ${statusColors[order.status]}`}
          >
            {labels[order.status]}
          </span>
          <strong className="text-right font-medium max-tablet:col-start-2 max-tablet:row-start-1">
            {formatMoney(order.total_cents)}
          </strong>
        </div>
      ))}
    </section>
  );
}
