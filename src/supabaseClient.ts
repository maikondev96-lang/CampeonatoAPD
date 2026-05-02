import { createClient } from '@supabase/supabase-js';
import { guardSupabaseUsage } from './security/supabaseGuard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltando variáveis de ambiente do Supabase!');
}

const original = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Proxy de proteção - Enforcer Layer
export const supabase = new Proxy(original, {
  get(target: any, prop: string) {
    const value = target[prop];

    if (typeof value === 'function' && prop === 'from') {
      return (...args: any[]) => {
        const queryBuilder = value.apply(target, args);
        
        // Retorna um proxy do queryBuilder para interceptar insert, update, delete
        return new Proxy(queryBuilder, {
          get(qbTarget: any, qbProp: string) {
            const qbValue = qbTarget[qbProp];
            if (typeof qbValue === 'function' && ['insert', 'update', 'delete'].includes(qbProp)) {
              return (...qbArgs: any[]) => {
                guardSupabaseUsage(new Error().stack || '', qbProp);
                return qbValue.apply(qbTarget, qbArgs);
              };
            }
            return qbValue;
          }
        });
      };
    }

    return value;
  }
});
