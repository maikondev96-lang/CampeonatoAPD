import { logger } from './logger';

interface FetchSafeOptions extends RequestInit {
  timeout?: number; // ms — padrão: 5000
}

/**
 * Fetch com timeout + cancelamento automático.
 * Lança erro padronizado com status HTTP em caso de falha.
 */
export async function fetchSafe(url: string, options: FetchSafeOptions = {}): Promise<Response> {
  const { timeout = 5000, signal: externalSignal, ...rest } = options;

  const controller = new AbortController();

  // Combina o signal externo (React Query) com o timeout interno
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  externalSignal?.addEventListener('abort', () => controller.abort());

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });

    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status} em ${url}`), { status: res.status });
    }

    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.warn('fetchSafe', `Request cancelado (timeout ${timeout}ms): ${url}`);
      throw Object.assign(new Error(`Timeout após ${timeout}ms`), { status: 408 });
    }
    logger.error('fetchSafe', `Falha no request: ${url}`, err);
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
