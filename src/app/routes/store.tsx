import { Link } from 'react-router-dom';
import ProductCard from '../../modules/catalog/components/ProductCard';
import { useCart } from '../../modules/cart/CartProvider';
import Page from '../../components/Page';

export default function Store() {
  const { products, quantities, changeQuantity, loading, error } = useCart();
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  return (
    <Page>
      <div className="mb-6 flex items-center justify-between">
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
      <section
        className="grid grid-cols-4 gap-5 max-desktop:grid-cols-2 max-desktop:gap-4 max-phone:grid-cols-1"
        aria-label="Produtos"
      >
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
    </Page>
  );
}
