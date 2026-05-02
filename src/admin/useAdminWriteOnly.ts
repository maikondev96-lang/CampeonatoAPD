import { useSafeAdminMutation, SafeMutationConfig } from './useSafeAdminMutation';

/**
 * Camada 4 — ADMIN ENGINE ONLY HOOK (FORÇADO)
 * Enforcer Hook: Garante que toda escrita de admin passe obrigatoriamente
 * por esta porta única, validando os requisitos mínimos de governança.
 */
export function useAdminWriteOnly<TData = unknown, TVariables = void>(config: SafeMutationConfig<TData, TVariables>) {
  if (!config.mutationFn) {
    throw new Error('[ADMIN ENGINE ENFORCER] mutationFn é estritamente obrigatório.');
  }

  // Verifica se o dev está executando em modo local/desenvolvimento
  if (import.meta.env.DEV) {
    console.log('[ADMIN ENGINE] Enforcement ativo para mutação.');
  }

  return useSafeAdminMutation(config);
}
