import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../modules/auth/AuthProvider';
import Layout, { PrivateLayout, PublicOnly } from './layout';
import Login from './routes/login';
import Register from './routes/register';
import Totp from './routes/totp';
import Store from './routes/store';
import Checkout from './routes/checkout';
import Orders from './routes/orders';
import Security from './routes/security';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/store" replace />} />
            <Route element={<PublicOnly />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="totp" element={<Totp />} />
            </Route>
            <Route element={<PrivateLayout />}>
              <Route path="store" element={<Store />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<Orders />} />
              <Route path="security" element={<Security />} />
            </Route>
            <Route
              path="*"
              element={
                <main className="store-shell">
                  <h1>Página não encontrada</h1>
                </main>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
