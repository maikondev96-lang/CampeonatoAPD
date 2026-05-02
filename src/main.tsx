import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { OfflineBanner } from './components/OfflineBanner.tsx'

// ─── Retry inteligente ────────────────────────────────────────────────────────
// 404 → não tenta de novo (vai falhar sempre)
// Rede / 500 → até 2 tentativas com backoff exponencial
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as any)?.status;
  if (status === 404 || status === 401 || status === 403) return false;
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 min de "frescor"
      gcTime: 1000 * 60 * 30,          // 30 min em memória
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,         // Recarrega ao reconectar (complementa o OfflineBanner)
      retry: shouldRetry,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000), // 1s, 2s, 4s... máx 10s
    },
  },
})

// ─── Persistência em localStorage ────────────────────────────────────────────
try {
  const persister = createSyncStoragePersister({ storage: window.localStorage })
  persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 30 })
} catch {
  // Safari privado ou localStorage cheio — falha silenciosa, app segue sem persistência
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <OfflineBanner />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
