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
      <header className="topbar">
        <div className="header-inner">
          <Link className="brand" to={user ? '/store' : '/login'}>
            Loja Segura
          </Link>
          {user && (
            <nav aria-label="Navegação principal">
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
        <p className="error session-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <main className="auth-shell">
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
