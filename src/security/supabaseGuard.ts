import { AdminEngine } from '../admin/adminEngine';

export function guardSupabaseUsage(stackTrace: string, action: string) {
  // O router do app usa URLs que começam com /admin
  const isAdminContext = window.location.pathname.startsWith('/admin') || stackTrace.includes('Admin');

  if (isAdminContext) {
    if (!AdminEngine.isMutating) {
      console.error(`[ENFORCER] Bloqueio estrutural: Tentativa de bypass usando .${action}() direto!`);
      throw new Error(
        `[ENFORCER] Escrita direta no Supabase (.${action}) proibida no Admin fora da AdminEngine.\n` +
        `Use o hook useSafeAdminMutation (ou useAdminWriteOnly) para garantir proteção contra double-submit e sincronia de cache.`
      );
    }
  }
}
