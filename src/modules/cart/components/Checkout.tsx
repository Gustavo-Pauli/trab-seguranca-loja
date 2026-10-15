import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../CartProvider';
import { placeOrder } from '../../orders/api';
import { errorMessage } from '../../../lib/api';
import Cart from './Cart';

export default function Checkout() {
  const {
    products,
    quantities,
    changeQuantity,
    clearCart,
    loading,
    error: catalogError,
  } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function checkout() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await placeOrder(quantities);
      if (result.status === 'APPROVED') {
        clearCart();
        setNotice('Compra aprovada.');
      }
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-[560px]">
      {loading && <p role="status">Carregando…</p>}
      <Cart
        products={products}
        quantities={quantities}
        busy={busy || loading}
        error={error || catalogError}
        notice={notice}
        onQuantityChange={changeQuantity}
        onCheckout={checkout}
      />
      <Link className="text-button mt-4 inline-block" to="/orders">
        Ver meus pedidos
      </Link>
    </div>
  );
}
