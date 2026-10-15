import CheckoutForm from '../../modules/cart/components/Checkout';
import Page from '../../components/Page';

export default function Checkout() {
  return (
    <Page>
      <h1>Carrinho</h1>
      <CheckoutForm />
    </Page>
  );
}
