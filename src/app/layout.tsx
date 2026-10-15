import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../modules/auth/AuthProvider';
import { CartProvider } from '../modules/cart/CartProvider';

export default function Layout() {
  const { user, demoMode, loading, logout, loggingOut, error } = useAuth();
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <header className="h-[72px] border-b border-zinc-200 bg-white max-tablet:h-auto max-tablet:min-h-16">
        <div
          className="mx-auto flex h-full max-w-[1168px] items-center justify-between gap-4 px-8
          max-tablet:min-h-16 max-tablet:flex-wrap max-tablet:px-5 max-tablet:py-3.5"
        >
          <Link
            className="text-lg font-[650] tracking-[-0.5px] max-tablet:text-[17px]"
            to={user ? '/store' : '/login'}
          >
            Loja Segura
          </Link>
          {user && (
            <nav
              className="flex items-center gap-6 text-[13px] [&_a.active]:font-semibold
                max-tablet:flex-wrap max-tablet:gap-3.5"
              aria-label="Navegação principal"
            >
              <NavLink to="/store">Loja</NavLink>
              <NavLink to="/checkout">Carrinho</NavLink>
              <NavLink to="/orders">Pedidos</NavLink>
              {demoMode && <NavLink to="/security">Testes</NavLink>}
              <button className="text-button" disabled={loggingOut} onClick={() => void logout()}>
                Sair
              </button>
            </nav>
          )}
        </div>
      </header>
      {error && (
        <p className="error mx-auto my-5 max-w-[1104px]" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <main
          className="flex min-h-[calc(100svh-72px)] items-center justify-center px-5 py-12
        max-tablet:min-h-[calc(100svh-64px)] max-tablet:py-8"
        >
          <p role="status">Carregando…</p>
        </main>
      ) : (
        <Outlet />
      )}
    </>
  );
}

export function PublicOnly() {
  return useAuth().user ? <Navigate to="/store" replace /> : <Outlet />;
}
export function PrivateLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <CartProvider key={user.id}>
      <Outlet />
    </CartProvider>
  );
}
