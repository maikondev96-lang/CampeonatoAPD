import React, { useEffect, useState } from 'react';

/**
 * Banner discreto de status de conexão.
 * Detecta navigator.onLine e eventos online/offline.
 * Não bloqueia a navegação — apenas informa o usuário.
 * O app continua funcionando com dados em cache (TanStack Query).
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '70px', // Acima do bottom nav no mobile
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#1e293b',
      color: '#f1f5f9',
      padding: '0.6rem 1.25rem',
      borderRadius: '9999px',
      fontSize: '0.8rem',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      whiteSpace: 'nowrap',
      animation: 'slideUp 0.3s ease',
    }}>
      <span style={{ fontSize: '0.9rem' }}>📡</span>
      Você está offline — exibindo dados em cache
    </div>
  );
}
