import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/app';
import './styles/base.css';
import './styles/store.css';
import './styles/security.css';
import './styles/responsive.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
