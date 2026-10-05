import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { setupApiCache } from './utils/apiCache'

setupApiCache();

// Auto-recover if a new production deployment changed chunk hashes while the user was away
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const lastReload = Number(sessionStorage.getItem('chunk_reload_last_ts') || 0);
    if (Date.now() - lastReload > 15000) {
      sessionStorage.setItem('chunk_reload_last_ts', String(Date.now()));
      window.location.reload();
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
