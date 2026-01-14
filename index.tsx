
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';


// Global error listener to catch crashes before React mounts
window.onerror = (message, source, lineno, colno, error) => {
  const errorMsg = `FATAL ERROR: ${message}\nAt: ${source}:${lineno}:${colno}`;
  console.error(errorMsg, error);
  // Display a fallback message if the root is empty (site is "grey")
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    root.innerHTML = `<div style="padding: 20px; color: #ef4444; background: #fee2e2; border-radius: 8px; font-family: sans-serif; margin: 20px;">
      <h1 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Erro ao carregar o FinancePro</h1>
      <p style="font-size: 14px;">Ocorreu um erro crítico durante a inicialização. Verifique o console do navegador (F12) para detalhes.</p>
    </div>`;
  }
};

const container = document.getElementById('root');
if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("React Render Error:", err);
  }
} else {
  console.error("ERRO CRÍTICO: Elemento #root não encontrado no DOM.");
}
