import OrderHistory from '../../modules/orders/components/OrderHistory';
import Page from '../../components/Page';

export default function Orders() {
  return (
    <Page>
      <h1>Meus pedidos</h1>
      <OrderHistory />
    </Page>
  );
}
