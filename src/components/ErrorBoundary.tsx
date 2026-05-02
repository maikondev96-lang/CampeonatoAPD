import React from 'react';
import { logger } from '../utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Error Boundary global.
 * Captura erros de renderização React e exibe fallback amigável.
 * Sem isso: qualquer erro em qualquer componente = tela branca total.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ErrorBoundary', 'Erro de renderização capturado', { error: error.message, stack: info.componentStack });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: '2rem', textAlign: 'center', fontFamily: 'inherit',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--primary-dark, #1a1a2e)' }}>
            Algo deu errado
          </h2>
          <p style={{ color: 'var(--text-muted, #666)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 360 }}>
            Um erro inesperado ocorreu. Seus dados estão seguros. Recarregue a página para continuar.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '8px',
              fontSize: '0.75rem', textAlign: 'left', maxWidth: '100%', overflowX: 'auto',
              marginBottom: '1.5rem', whiteSpace: 'pre-wrap',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '0.75rem 1.5rem', background: 'var(--primary-color, #00e676)',
              color: '#000', border: 'none', borderRadius: '8px', fontWeight: 800,
              cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
