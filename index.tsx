
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Shim para process.env em ambiente de navegador (Vercel/Static)
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      API_KEY: (window as any).API_KEY || ''
    }
  };
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("ERRO CRÍTICO: Elemento #root não encontrado no DOM.");
}
