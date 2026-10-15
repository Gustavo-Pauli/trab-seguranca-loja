import CheckoutForm from '../../modules/cart/components/Checkout';
export default function Checkout() {
  return (
    <main className="mx-auto max-w-[1168px] px-8 pt-10 pb-16 max-tablet:px-5 max-tablet:pt-7 max-tablet:pb-10">
      <h1>Carrinho</h1>
      <CheckoutForm />
    </main>
  );
}
