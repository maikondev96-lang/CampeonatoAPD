import React from 'react';
import { supabase } from '../supabaseClient';

/**
 * Interface para os metadados de versão
 */
interface AppMetadata {
  tabela: string;
  version: number;
  updated_at: string;
}

/**
 * Função inteligente que gerencia cache local com validação de versão remota.
 * @param tabela Nome da tabela/entidade para controle de cache
 * @param fetcher Função assíncrona que busca os dados caso o cache esteja desatualizado
 */
export async function getSmartData<T>(tabela: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    // 1. Busca a versão atual no Supabase
    const { data: meta, error } = await supabase
      .from('app_metadata')
      .select('version')
      .eq('tabela', tabela)
      .single();

    if (error) {
      console.warn(`[SmartCache] Erro ao buscar versão para ${tabela}:`, error);
      return await fetcher(); // Fallback para fetch direto
    }

    const remoteVersion = meta.version;
    const localVersion = localStorage.getItem(`cache_v_${tabela}`);
    const cachedData = localStorage.getItem(`cache_data_${tabela}`);

    // 2. Verifica se o cache é válido
    if (cachedData && localVersion && parseInt(localVersion) === remoteVersion) {
      return JSON.parse(cachedData) as T;
    }

    // 3. Se for diferente ou não existir, busca dados frescos
    const freshData = await fetcher();

    // 4. Salva no cache local
    localStorage.setItem(`cache_data_${tabela}`, JSON.stringify(freshData));
    localStorage.setItem(`cache_v_${tabela}`, remoteVersion.toString());

    return freshData;
  } catch (err) {
    console.error(`[SmartCache] Erro crítico na tabela ${tabela}:`, err);
    return await fetcher();
  }
}

/**
 * Hook customizado para usar o SmartCache com padrão SWR (Stale-While-Revalidate).
 * Retorna o cache imediatamente e atualiza em background se necessário.
 */
export function useSmartData<T>(tabela: string, fetcher: () => Promise<T>) {
  const [data, setData] = React.useState<T | null>(() => {
    const cached = localStorage.getItem(`cache_data_${tabela}`);
    if (cached) {
      try { return JSON.parse(cached) as T; } catch { return null; }
    }
    return null;
  });
  const [loading, setLoading] = React.useState(!data);

  React.useEffect(() => {
    let isMounted = true;
    
    async function sync() {
      const freshData = await getSmartData(tabela, fetcher);
      if (isMounted) {
        setData(freshData);
        setLoading(false);
      }
    }

    sync();
    return () => { isMounted = false; };
  }, [tabela]);

  return { data, loading };
}

/**
 * Função para invalidar o cache e forçar atualização na próxima carga
 */
export function invalidateCache(tabela: string) {
  localStorage.removeItem(`cache_v_${tabela}`);
  localStorage.removeItem(`cache_data_${tabela}`);
}

/**
 * Helper para atualizar a versão no banco de dados após uma operação de escrita (Admin)
 */
export async function bumpTableVersion(tabela: string) {
  try {
    // Busca versão atual para incrementar
    const { data: current } = await supabase
      .from('app_metadata')
      .select('version')
      .eq('tabela', tabela)
      .single();
    
    const nextVersion = (current?.version || 0) + 1;

    const { error } = await supabase
      .from('app_metadata')
      .update({ 
        version: nextVersion,
        updated_at: new Date().toISOString() 
      })
      .eq('tabela', tabela);

    if (error) throw error;
  } catch (err) {
    console.error(`[SmartCache] Falha ao atualizar versão de ${tabela}:`, err);
  }
}
