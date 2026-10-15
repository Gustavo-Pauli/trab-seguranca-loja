import { api } from '../../lib/api';
import type { Product } from './types';

export async function fetchProducts() {
  return (await api<{ products: Product[] }>('/products')).products;
}
