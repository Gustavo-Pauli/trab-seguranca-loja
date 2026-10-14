import { formatMoney } from '../../../lib/api';
import type { Product } from '../../catalog/types';
import type { CartQuantities } from '../types';

type Props = {
  products: Product[];
  quantities: CartQuantities;
  busy: boolean;
  error: string;
  notice: string;
  onQuantityChange: (id: string, quantity: number) => void;
  onCheckout: () => void;
};

export default function Cart(props: Props) {
  const selected = props.products.filter((product) => props.quantities[product.id] > 0);
  const count = selected.reduce((sum, product) => sum + props.quantities[product.id], 0);
  const total = selected.reduce((sum, product) => {
    return sum + product.price_cents * props.quantities[product.id];
  }, 0);

  return (
    <aside className="cart-card" aria-label="Carrinho">
      <div className="cart-heading">
        <h2>Carrinho</h2>
        <span className="muted">
          {count} {count === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {selected.length === 0 && (
        <div className="empty-cart">
          <p>Seu carrinho está vazio.</p>
          <span>Escolha um produto para começar.</span>
        </div>
      )}

      <div className="cart-items">
        {selected.map((product) => {
          const quantity = props.quantities[product.id];

          return (
            <div className="cart-item" key={product.id}>
              <div>
                <h3>{product.name}</h3>
                <span className="muted">{formatMoney(product.price_cents * quantity)}</span>
              </div>
              <div className="quantity">
                <button
                  aria-label={`Diminuir ${product.name}`}
                  onClick={() => props.onQuantityChange(product.id, quantity - 1)}
                  disabled={props.busy}
                >
                  −
                </button>
                <output aria-label={`Quantidade de ${product.name}`}>{quantity}</output>
                <button
                  aria-label={`Aumentar ${product.name}`}
                  onClick={() => props.onQuantityChange(product.id, quantity + 1)}
                  disabled={props.busy || quantity >= 10}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cart-total">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      <button
        className="primary full"
        onClick={props.onCheckout}
        disabled={props.busy || selected.length === 0}
      >
        {props.busy ? 'Aguarde…' : 'Finalizar compra'}
      </button>
      {props.error && (
        <p className="error" role="alert">
          {props.error}
        </p>
      )}
      {props.notice && (
        <p className="success" role="status">
          {props.notice}
        </p>
      )}
    </aside>
  );
}
