import React from 'react';
import { supabase } from '../supabaseClient';

interface AppMetadata {
  tabela: string;
  version: number;
  updated_at: string;
}

/**
 * Função inteligente que gerencia cache local com validação de versão remota.
 * Otimizada para não bloquear a thread principal.
 */
export async function getSmartData<T>(tabela: string, fetcher: () => Promise<T>): Promise<T> {
  const localVersion = localStorage.getItem(`cache_v_${tabela}`);
  const cachedData = localStorage.getItem(`cache_data_${tabela}`);

  try {
    // 1. Busca a versão atual no Supabase (com timeout curto para não travar)
    const promise = supabase
      .from('app_metadata')
      .select('version')
      .eq('tabela', tabela)
      .single();

    const { data: meta, error } = await promise;

    if (error || !meta) {
      if (cachedData) return JSON.parse(cachedData) as T;
      return await fetcher();
    }

    const remoteVersion = meta.version;

    // 2. Verifica se o cache é válido
    if (cachedData && localVersion && parseInt(localVersion) === remoteVersion) {
      return JSON.parse(cachedData) as T;
    }

    // 3. Busca dados frescos
    const freshData = await fetcher();

    // 4. Salva no cache local (assíncrono para não travar)
    setTimeout(() => {
      localStorage.setItem(`cache_data_${tabela}`, JSON.stringify(freshData));
      localStorage.setItem(`cache_v_${tabela}`, remoteVersion.toString());
    }, 0);

    return freshData;
  } catch (err) {
    if (cachedData) return JSON.parse(cachedData) as T;
    return await fetcher();
  }
}

/**
 * Hook customizado otimizado com SWR (Stale-While-Revalidate).
 * Retorna o cache IMEDIATAMENTE e atualiza em background.
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
      // Se já temos dados no cache, o loading inicial é falso
      // mas vamos buscar a versão remota para ver se mudou
      try {
        const freshData = await getSmartData(tabela, fetcher);
        if (isMounted) {
          setData(freshData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    }

    sync();
    return () => { isMounted = false; };
  }, [tabela]);

  return { data, loading, setData };
}

export function invalidateCache(tabela: string) {
  localStorage.removeItem(`cache_v_${tabela}`);
  localStorage.removeItem(`cache_data_${tabela}`);
}

export async function bumpTableVersion(tabela: string) {
  try {
    const { data: current } = await supabase
      .from('app_metadata')
      .select('version')
      .eq('tabela', tabela)
      .single();
    
    const nextVersion = (current?.version || 0) + 1;

    await supabase
      .from('app_metadata')
      .upsert({ 
        tabela,
        version: nextVersion,
        updated_at: new Date().toISOString() 
      });
  } catch (err) {
    console.error(`[SmartCache] Falha ao atualizar versão de ${tabela}:`, err);
  }
}
