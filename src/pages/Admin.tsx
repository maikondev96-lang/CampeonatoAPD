import React from 'react';
import { useSeasonContext } from '../components/SeasonContext';
import { useOrganizationContext } from '../components/OrganizationContext';
import { Trophy, Plus, Settings, ChevronRight, Globe, Layers, Activity, History as HistoryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoApd from '../assets/logo.png';
import apdNews from '../assets/apd-news.jpg';

export default function AdminHub() {
  const { organization } = useOrganizationContext();
  const { competitions, loading } = useSeasonContext();

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Carregando Campeonatos...</div>;

  return (
    <div className="animate-fade">
      <div className="admin-header-app">
        <div className="admin-header-title">
          <Globe size={18} />
          <h1>HUB ADMINISTRATIVO</h1>
        </div>
        <p className="admin-header-subtitle">{organization?.name} — Gestão Multi-Competição</p>
        <Link to="/admin/new-championship" className="btn-app-primary">
          <Plus size={16} /> NOVO CAMPEONATO
        </Link>
      </div>

      <div className="fs-comps-section" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
        <div className="fs-section-header">CAMPEONATOS DA ORGANIZAÇÃO</div>
        <div className="fs-comps-list">
          {competitions.map((comp) => {
            const activeSeason = comp.seasons?.find(s => s.status === 'active') || comp.seasons?.[0];
            return (
              <div key={comp.id} className="fs-comp-item-admin">
                <div className="fs-comp-item-main">
                  <img src={comp.logo_url || logoApd} alt="" className="fs-comp-logo-large" />
                  <div className="fs-comp-details">
                    <span className="fs-comp-country" style={{ fontSize: '0.65rem', fontWeight: 800, color: comp.is_active ? 'var(--primary-dark)' : 'var(--text-muted)' }}>
                      {comp.is_active ? '● ATIVO' : 'ARQUIVADO'}
                    </span>
                    <h3 className="fs-comp-name" style={{ fontSize: '1rem', marginTop: '2px' }}>{comp.name} {activeSeason?.year}</h3>
                    <span className="fs-comp-type">{comp.type.toUpperCase()}</span>
                  </div>
                </div>
                <div className="fs-comp-actions">
                  <Link to={`/admin/${comp.slug}/${activeSeason?.year || 2026}`} className="btn-app-outline">Gerenciar</Link>
                  <Link to={`/admin/${comp.slug}/${activeSeason?.year || 2026}/settings`} className="btn-app-icon"><Settings size={16}/></Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER HUB */}
      <div className="fs-comps-section" style={{ marginTop: '2rem' }}>
        <div className="fs-section-header">CONFIGURAÇÕES GLOBAIS</div>
        <div className="fs-comps-list">
          <Link to="/admin/news" className="fs-comp-item">
             <div className="fs-comp-logo" style={{ background: 'var(--surface-alt)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, overflow: 'hidden' }}>
               <img src={apdNews} alt="APD News" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             </div>
             <div className="fs-comp-details" style={{ marginLeft: '12px' }}>
               <h3 className="fs-comp-name">APD News</h3>
               <span className="fs-comp-country" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Publicações na Home</span>
             </div>
             <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </Link>
          <Link to="/admin/history" className="fs-comp-item">
             <div className="fs-comp-logo" style={{ background: 'var(--surface-alt)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, overflow: 'hidden' }}>
                <HistoryIcon size={20} />
             </div>
             <div className="fs-comp-details" style={{ marginLeft: '12px' }}>
               <h3 className="fs-comp-name">Nossa História</h3>
               <span className="fs-comp-country" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gerenciar Linha do Tempo</span>
             </div>
             <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </Link>
          <div className="fs-comp-item" style={{ cursor: 'pointer' }} onClick={() => alert('Módulo de Organização: Aqui você poderá alterar a logo da APD, nome oficial e cores padrão de todo o portal. Funcionalidade em desenvolvimento!')}>
             <div className="fs-comp-logo" style={{ background: 'var(--surface-alt)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}>
               <Settings size={12} />
             </div>
             <div className="fs-comp-details">
               <h3 className="fs-comp-name">Organização</h3>
               <span className="fs-comp-country" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Identidade Visual da APD</span>
             </div>
             <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
