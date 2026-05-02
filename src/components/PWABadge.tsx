import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCcw, X } from 'lucide-react'

function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div 
      className="pwa-badge animate-slide-in"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 10000,
        background: 'var(--card-bg)',
        border: '1px solid var(--primary-color)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        maxWidth: '300px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary-color)' }}>
          {offlineReady ? 'APP PRONTO PARA OFFLINE' : 'NOVA VERSÃO DISPONÍVEL'}
        </h4>
        <button onClick={close} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {offlineReady 
          ? 'O aplicativo agora funciona sem internet. Você pode instalá-lo na tela inicial.' 
          : 'Uma atualização importante foi lançada para o portal Copa APD.'}
      </p>

      {needRefresh && (
        <button 
          className="btn btn-primary" 
          onClick={() => updateServiceWorker(true)}
          style={{ width: '100%', gap: '8px' }}
        >
          <RefreshCcw size={16} /> ATUALIZAR AGORA
        </button>
      )}
    </div>
  )
}

export default PWABadge
