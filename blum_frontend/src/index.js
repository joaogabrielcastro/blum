import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Verifica se o Service Worker é suportado pelo navegador
// e o registra antes da aplicação React ser renderizada.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration.scope);
      })
      .catch(error => {
        console.log('Falha no registro do Service Worker:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);