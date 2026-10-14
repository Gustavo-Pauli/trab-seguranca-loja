import { api } from '../../lib/api';
import type { Order } from './types';
import type { CartQuantities } from '../cart/types';
export async function fetchOrders() {
  return (await api<{ orders: Order[] }>('/orders')).orders;
}
export function placeOrder(quantities: CartQuantities) {
  // Nenhum preço, total ou estado de autenticação é declarado pelo navegador.
  const items = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([product_id, quantity]) => ({ product_id, quantity }));
  return api<{ status: string; order_id: string }>('/checkout', { items });
}
