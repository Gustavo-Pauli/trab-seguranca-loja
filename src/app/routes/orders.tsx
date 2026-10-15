import OrderHistory from '../../modules/orders/components/OrderHistory';
export default function Orders() {
  return (
    <main className="mx-auto max-w-[1168px] px-8 pt-10 pb-16 max-tablet:px-5 max-tablet:pt-7 max-tablet:pb-10">
      <h1>Meus pedidos</h1>
      <OrderHistory />
    </main>
  );
}
