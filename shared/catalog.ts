export const products = [
  {
    id: 'P01',
    name: 'Caderno pontilhado',
    description: 'Capa rígida · 160 páginas',
    price_cents: 5000,
    illustration: 'notebook',
  },
  {
    id: 'P02',
    name: 'Caneca de cerâmica',
    description: 'Acabamento fosco · 300 ml',
    price_cents: 3500,
    illustration: 'mug',
  },
  {
    id: 'P03',
    name: 'Bolsa de algodão',
    description: 'Algodão natural · 35 × 40 cm',
    price_cents: 4500,
    illustration: 'bag',
  },
  {
    id: 'P04',
    name: 'Garrafa térmica',
    description: 'Aço inox · 500 ml',
    price_cents: 8000,
    illustration: 'bottle',
  },
] as const;

export type Item = {
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_price_cents: number;
};

const MAX_ITEM_QUANTITY = 10;

export function orderItems(input: unknown): Item[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > products.length) {
    throw new Error('INVALID_ITEMS');
  }

  const seen = new Set<string>();

  return input.map((item) => {
    const product = products.find((candidate) => candidate.id === item?.product_id);

    if (!product) {
      throw new Error('INVALID_ITEMS');
    }

    const quantityValid =
      Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= MAX_ITEM_QUANTITY;
    const repeatedProduct = seen.has(product.id);

    if (!quantityValid || repeatedProduct) {
      throw new Error('INVALID_ITEMS');
    }

    seen.add(product.id);

    // Mantém a quantidade recebida e busca o preço no catálogo.
    return {
      product_id: product.id,
      quantity: item.quantity,
      unit_price: product.price_cents / 100,
      unit_price_cents: product.price_cents,
    };
  });
}

export function totalCents(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
}
