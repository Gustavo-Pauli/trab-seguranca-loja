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
    <aside
      className="sticky top-6 rounded-[9px] border border-zinc-200 bg-white p-[22px]
        max-desktop:p-[18px] max-tablet:static"
      aria-label="Carrinho"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base">Carrinho</h2>
        <span className="text-xs text-zinc-500">
          {count} {count === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {selected.length === 0 && (
        <div className="pt-9 pb-8 text-center text-zinc-400">
          <p className="mt-3 text-[13px] text-zinc-500">Seu carrinho está vazio.</p>
          <span className="text-[11px]">Escolha um produto para começar.</span>
        </div>
      )}

      <div className="my-[18px]">
        {selected.map((product) => {
          const quantity = props.quantities[product.id];

          return (
            <div
              className="flex items-center justify-between gap-2 border-b border-zinc-100 py-3.5"
              key={product.id}
            >
              <div>
                <h3 className="text-xs font-medium">{product.name}</h3>
                <span className="text-xs text-zinc-500">
                  {formatMoney(product.price_cents * quantity)}
                </span>
              </div>
              <div className="flex h-8 shrink-0 items-center rounded-[5px] border border-zinc-200">
                <button
                  className="h-[30px] w-[27px] bg-transparent p-0 text-zinc-600 hover:bg-zinc-100"
                  aria-label={`Diminuir ${product.name}`}
                  onClick={() => props.onQuantityChange(product.id, quantity - 1)}
                  disabled={props.busy}
                >
                  −
                </button>
                <output
                  className="min-w-5 text-center text-xs"
                  aria-label={`Quantidade de ${product.name}`}
                >
                  {quantity}
                </output>
                <button
                  className="h-[30px] w-[27px] bg-transparent p-0 text-zinc-600 hover:bg-zinc-100"
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

      <div className="mb-5 flex justify-between border-t border-zinc-200 pt-[19px] text-sm">
        <span>Total</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      <button
        className="primary w-full"
        onClick={props.onCheckout}
        disabled={props.busy || selected.length === 0}
      >
        {props.busy ? 'Aguarde…' : 'Finalizar compra'}
      </button>
      {props.error && (
        <p className="error mt-4 mb-0" role="alert">
          {props.error}
        </p>
      )}
      {props.notice && (
        <p
          className="mt-4 rounded-md bg-green-50 p-3 text-[13px] leading-normal text-green-800"
          role="status"
        >
          {props.notice}
        </p>
      )}
    </aside>
  );
}
