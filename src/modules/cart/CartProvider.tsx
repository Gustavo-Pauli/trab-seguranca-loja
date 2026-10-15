import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartQuantities } from './types';
import type { Product } from '../catalog/types';
import { fetchProducts } from '../catalog/api';
import { errorMessage } from '../../lib/api';

type CartState = {
  products: Product[];
  quantities: CartQuantities;
  loading: boolean;
  error: string;
  changeQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<CartQuantities>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    fetchProducts()
      .then((catalog) => {
        if (active) {
          setProducts(catalog);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function changeQuantity(id: string, quantity: number) {
    const bounded = Math.max(0, Math.min(10, quantity));
    setQuantities((current) => ({ ...current, [id]: bounded }));
  }

  return (
    <CartContext.Provider
      value={{
        products,
        quantities,
        loading,
        error,
        changeQuantity,
        clearCart: () => setQuantities({}),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);

  if (!cart) {
    throw new Error('CartProvider ausente.');
  }

  return cart;
}
