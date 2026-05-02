import { useMemo } from 'react';

export interface QueryEngineState {
  loading: boolean;
  error: boolean;
  warning: boolean;
  success: boolean;
}

/**
 * Hook centralizado para gerenciar estados do React Query + Contextos externos
 */
export function useQueryEngine<TData = any>(
  query: { data: TData | undefined; isLoading: boolean; isError: boolean; refetch: () => void },
  externalLoading: boolean = false
) {
  const { data, isLoading, isError, refetch } = query;

  const state = useMemo<QueryEngineState>(() => {
    const isActuallyLoading = isLoading || externalLoading;
    return {
      loading: isActuallyLoading && !data,
      error: isError && !data,
      warning: isError && !!data,
      success: !!data
    };
  }, [isLoading, externalLoading, isError, data]);

  return {
    state,
    data,
    refetch
  };
}
