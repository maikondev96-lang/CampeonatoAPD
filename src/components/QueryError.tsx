import React from 'react';
import { RefreshCw } from 'lucide-react';

interface QueryErrorProps {
  /** Mensagem específica do contexto. Ex: "Erro ao carregar os jogos." */
  message?: string;
  /** Função refetch do useQuery */
  onRetry?: () => void;
}

/**
 * Componente padrão de erro para todas as queries TanStack.
 * Substitui o padrão if (error && !data) espalhado pelas páginas.
 *
 * Uso:
 *   const { data, isLoading, isError, refetch } = useQuery(...)
 *   if (isError && !data) return <QueryError onRetry={refetch} />
 */
export function QueryError({ message = 'Erro ao carregar os dados.', onRetry }: QueryErrorProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '40vh', gap: '1rem',
      color: 'var(--text-muted)', textAlign: 'center', padding: '2rem',
    }}>
      <span style={{ fontSize: '2.5rem' }}>📡</span>
      <p style={{ fontWeight: 700, fontSize: '0.95rem', maxWidth: 300 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', borderRadius: '8px',
            background: 'var(--primary-color, #00e676)', color: '#000',
            border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
