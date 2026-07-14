import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import {
  initFrontendSentry,
  isSentryConfigured,
  Sentry,
} from './observability/sentry';

initFrontendSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrado:', registration.scope);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'activated' &&
            navigator.serviceWorker.controller
          ) {
            window.location.reload();
          }
        });
      });

      setInterval(() => registration.update(), 60 * 60 * 1000);
    } catch (error) {
      console.log('Falha no registro do Service Worker:', error);
      if (isSentryConfigured()) {
        Sentry.captureException(error);
      }
    }
  });
}

const appTree = (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <App />
    </ToastProvider>
  </QueryClientProvider>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isSentryConfigured() ? (
      <Sentry.ErrorBoundary
        fallback={
          <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            <h1>Algo deu errado</h1>
            <p>Recarregue a página. Se o problema continuar, contacte o suporte.</p>
          </div>
        }
        showDialog={false}
      >
        {appTree}
      </Sentry.ErrorBoundary>
    ) : (
      appTree
    )}
  </React.StrictMode>
);
