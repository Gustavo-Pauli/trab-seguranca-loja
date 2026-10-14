import { Link } from 'react-router-dom';
import ProductCard from '../../modules/catalog/components/ProductCard';
import { useCart } from '../../modules/cart/CartProvider';

export default function Store() {
  const { products, quantities, changeQuantity, loading, error } = useCart();
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  return (
    <main className="store-shell">
      <div className="store-heading">
        <h1>Produtos</h1>
        <Link className="secondary" to="/checkout">
          Carrinho ({count})
        </Link>
      </div>
      {loading && <p role="status">Carregando…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="product-grid" aria-label="Produtos">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            quantity={quantities[product.id] ?? 0}
            busy={false}
            onAdd={() => changeQuantity(product.id, (quantities[product.id] ?? 0) + 1)}
          />
        ))}
      </section>
    </main>
  );
}
