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
    <article className="overflow-hidden rounded-[9px] border border-zinc-200 bg-white">
      <ProductArt kind={product.illustration} />
      <div className="p-[18px] max-tablet:p-[15px]">
        <h2 className="text-[15px] max-tablet:text-sm">{product.name}</h2>
        <p className="mt-1 text-xs text-zinc-500 max-tablet:text-[11px]">{product.description}</p>
        <div
          className="mt-[19px] flex items-center justify-between gap-2
          max-desktop:flex-col max-desktop:items-start max-desktop:gap-3"
        >
          <strong className="text-sm font-semibold">{formatMoney(product.price_cents)}</strong>
          <button
            className="secondary min-h-[35px] px-3 py-2 text-xs max-desktop:w-full"
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
