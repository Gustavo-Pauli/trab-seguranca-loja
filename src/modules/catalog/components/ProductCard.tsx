import { formatMoney } from '../../../lib/api';
import type { Product } from '../types';
import ProductArt from './ProductArt';

type Props = {
  product: Product;
  quantity: number;
  busy: boolean;
  onAdd: () => void;
};

export default function ProductCard({ product, quantity, busy, onAdd }: Props) {
  return (
    <article className="product-card">
      <ProductArt kind={product.illustration} />
      <div className="product-info">
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <div className="product-bottom">
          <strong>{formatMoney(product.price_cents)}</strong>
          <button
            className="secondary"
            disabled={busy || quantity >= 10}
            onClick={onAdd}
            aria-label={`Adicionar ${product.name}`}
          >
            Adicionar
          </button>
        </div>
      </div>
    </article>
  );
}
