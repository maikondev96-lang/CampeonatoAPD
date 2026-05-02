import React from 'react';
import { RefreshCw } from 'lucide-react';

interface QueryErrorProps {
  /** Mensagem específica do contexto. Ex: "Erro ao carregar os jogos." */
  message?: string;
  /** Função refetch do useQuery */
  onRetry?: () => void;
  /** Variante visual. error = bloco grande. warning = banner menor. */
  variant?: 'error' | 'warning';
}

/**
 * Componente padrão de erro para todas as queries TanStack.
 * Substitui o padrão if (error && !data) espalhado pelas páginas.
 *
 * Uso:
 *   const { data, isLoading, isError, refetch } = useQuery(...)
 *   if (isError && !data) return <QueryError onRetry={refetch} />
 */
export function QueryError({ message = 'Erro ao carregar os dados.', onRetry, variant = 'error' }: QueryErrorProps) {
  const isWarning = variant === 'warning';

  return (
    <div style={{
      display: 'flex', 
      flexDirection: isWarning ? 'row' : 'column', 
      alignItems: 'center',
      justifyContent: 'center', 
      minHeight: isWarning ? 'auto' : '40vh', 
      gap: '1rem',
      color: isWarning ? '#b45309' : 'var(--text-muted)', 
      background: isWarning ? '#fef3c7' : 'transparent',
      textAlign: isWarning ? 'left' : 'center', 
      padding: isWarning ? '1rem' : '2rem',
      borderRadius: isWarning ? '8px' : '0',
      margin: isWarning ? '1rem 0' : '0'
    }}>
      <span style={{ fontSize: isWarning ? '1.5rem' : '2.5rem' }}>{isWarning ? '⚠️' : '📡'}</span>
      <p style={{ fontWeight: 700, fontSize: '0.95rem', maxWidth: isWarning ? 'none' : 300, flex: 1, margin: 0 }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.25rem', borderRadius: '8px',
            background: isWarning ? '#f59e0b' : 'var(--primary-color, #00e676)', color: '#000',
            border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem',
            whiteSpace: 'nowrap'
          }}
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
