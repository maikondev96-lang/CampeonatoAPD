import { useMutation } from '@tanstack/react-query';
import { AdminEngine } from './adminEngine';
import { queryClient } from '../main';

export interface SafeMutationConfig<TData = any, TVariables = any> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateKeys?: any[][];
  onSuccess?: (data: TData) => void;
  onError?: (error: any) => void;
}

export function useSafeAdminMutation<TData = any, TVariables = any>(config: SafeMutationConfig<TData, TVariables>) {
  return useMutation<TData, any, TVariables>({
    mutationFn: async (variables: TVariables) => {
      // Usa a safeMutation real do AdminEngine para a chamada que vai para o banco, 
      // assim o isMutating protege o fluxo real desde o início
      return AdminEngine.safeMutation({
        mutationFn: () => config.mutationFn(variables),
        invalidateKeys: config.invalidateKeys,
        onSuccess: config.onSuccess,
        onError: (err: any) => {
          // Camada 6 - Rollback / Invalidação de segurança
          if (config.invalidateKeys) {
            config.invalidateKeys.forEach((key: any) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
          console.error('Rollback automático ativado. Cache limpo devido ao erro:', err);
          config.onError?.(err);
        }
      });
    },
    onMutate: () => {
      // Bloqueia double submit (também validado no safeMutation)
      if (AdminEngine.isMutating) throw new Error('Mutation em andamento');
    }
  });
}
