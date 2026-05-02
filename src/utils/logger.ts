/**
 * Logger centralizado — substitui console.log direto.
 * Em produção, pode ser conectado ao Sentry com uma linha.
 */

const isProd = import.meta.env.PROD;

function format(level: string, context: string, message: string, data?: unknown): string {
  return `[${context}] ${message}`;
}

export const logger = {
  log(context: string, message: string, data?: unknown) {
    if (!isProd) console.log(format('LOG', context, message), data ?? '');
  },

  warn(context: string, message: string, data?: unknown) {
    console.warn(format('WARN', context, message), data ?? '');
  },

  error(context: string, message: string, error?: unknown) {
    console.error(format('ERROR', context, message), error ?? '');
    // Ponto de extensão: Sentry.captureException(error)
  },
};
