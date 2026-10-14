import OrderHistory from '../../modules/orders/components/OrderHistory';
export default function Orders() {
  return (
    <main className="store-shell">
      <h1>Meus pedidos</h1>
      <OrderHistory />
    </main>
  );
}
