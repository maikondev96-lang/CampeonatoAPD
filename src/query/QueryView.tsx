import React from 'react';
import { QueryEngineState } from './useQueryEngine';
import { QueryError } from '../components/QueryError';
import { Loader2 } from 'lucide-react';

interface QueryViewProps<T> {
  state: QueryEngineState;
  data: T | undefined;
  onRetry: () => void;
  children: (data: NonNullable<T>) => React.ReactNode;
  LoadingComponent?: React.FC;
  ErrorComponent?: React.FC<{ onRetry: () => void }>;
  WarningComponent?: React.FC<{ onRetry: () => void }>;
}

export const DefaultLoading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
    <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
  </div>
);

export const DefaultError = ({ onRetry }: { onRetry: () => void }) => (
  <QueryError message="Erro ao carregar os dados." onRetry={onRetry} variant="error" />
);

export const DefaultWarning = ({ onRetry }: { onRetry: () => void }) => (
  <QueryError message="Conexão instável. Exibindo dados antigos." onRetry={onRetry} variant="warning" />
);

export function QueryView<T>({
  state,
  data,
  onRetry,
  LoadingComponent = DefaultLoading,
  ErrorComponent = DefaultError,
  WarningComponent = DefaultWarning,
  children
}: QueryViewProps<T>) {
  if (state.loading) {
    return <LoadingComponent />;
  }

  if (state.error) {
    return <ErrorComponent onRetry={onRetry} />;
  }

  return (
    <>
      {state.warning && <WarningComponent onRetry={onRetry} />}
      {state.success && data !== undefined ? children(data as NonNullable<T>) : null}
    </>
  );
}
