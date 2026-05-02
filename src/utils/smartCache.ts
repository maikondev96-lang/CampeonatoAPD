import React from 'react';

const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutos

/**
 * Cache simples baseado em localStorage com TTL.
 * NÃO depende da tabela 'app_metadata' (que não existe no banco).
 */
export async function getSmartData<T>(tabela: string, fetcher: () => Promise<T>): Promise<T> {
  const cacheKey = `cache_data_${tabela}`;
  const cacheTimeKey = `cache_time_${tabela}`;

  try {
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheTimeKey);

    // Usa cache se existir e ainda for válido (dentro do TTL)
    if (cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      if (age < CACHE_TTL_MS) {
        return JSON.parse(cachedData) as T;
      }
    }

    // Cache expirado ou inexistente: busca dados frescos
    const freshData = await fetcher();

    // Salva em background para não bloquear a UI
    setTimeout(() => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(freshData));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch (e) {
        // localStorage cheio — ignora silenciosamente
      }
    }, 0);

    return freshData;
  } catch (err) {
    // Se qualquer coisa falhar, tenta usar dados do cache mesmo que expirados
    const staleCached = localStorage.getItem(cacheKey);
    if (staleCached) return JSON.parse(staleCached) as T;

    // Última tentativa: vai ao fetcher diretamente
    return await fetcher();
  }
}

/**
 * Hook customizado com SWR (Stale-While-Revalidate).
 * Retorna o cache IMEDIATAMENTE e revalida em background.
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
  localStorage.removeItem(`cache_data_${tabela}`);
  localStorage.removeItem(`cache_time_${tabela}`);
}

/**
 * Stub: bumpTableVersion não faz nada pois app_metadata não existe.
 * Mantido para não quebrar imports nos componentes Admin.
 */
export async function bumpTableVersion(tabela: string): Promise<void> {
  // Invalida o cache local para forçar refetch na próxima visita
  invalidateCache(tabela);
}
