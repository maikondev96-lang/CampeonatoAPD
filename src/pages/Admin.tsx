import React from 'react';
import { useSeasonContext } from '../components/SeasonContext';
import { useOrganizationContext } from '../components/OrganizationContext';
import { Trophy, Plus, Settings, ChevronRight, Globe, Layers, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoApd from '../assets/logo.png';

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
                    <span className="fs-comp-country">{comp.is_active ? '● ATIVO' : 'ARQUIVADO'}</span>
                    <h3 className="fs-comp-name">{comp.name} {activeSeason?.year}</h3>
                    <span className="fs-comp-type">{comp.type.toUpperCase()}</span>
                  </div>
                </div>
                <div className="fs-comp-actions">
                  <Link to={`/admin/${comp.slug}/${activeSeason?.year || 2026}`} className="btn-app-outline">Gerenciar</Link>
                  <Link to={`/admin/${comp.slug}/${activeSeason?.year || 2026}/settings`} className="btn-app-icon"><Settings size={14}/></Link>
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
             <div className="fs-comp-logo" style={{ background: 'var(--surface-alt)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Globe size={12} />
             </div>
             <div className="fs-comp-details">
               <h3 className="fs-comp-name">Motor de Notícias (GE)</h3>
               <span className="fs-comp-country">Publicações na Home</span>
             </div>
             <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </Link>
          <div className="fs-comp-item" style={{ cursor: 'pointer' }}>
             <div className="fs-comp-logo" style={{ background: 'var(--surface-alt)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Settings size={12} />
             </div>
             <div className="fs-comp-details">
               <h3 className="fs-comp-name">Organização</h3>
               <span className="fs-comp-country">Identidade Visual da APD</span>
             </div>
             <ChevronRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </div>
        </div>
      </div>
      <style>{`
        .admin-header-app {
          padding: 16px;
          background: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .admin-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--primary-dark);
        }
        .admin-header-title h1 {
          font-size: 1.1rem;
          font-weight: 900;
          margin: 0;
        }
        .admin-header-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }
        .btn-app-primary {
          background: var(--primary-color);
          color: white;
          padding: 10px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          text-transform: uppercase;
        }
        .fs-comp-item-admin {
          display: flex;
          flex-direction: column;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
          gap: 12px;
          background: var(--card-bg);
        }
        .fs-comp-item-main {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .fs-comp-logo-large {
          width: 32px;
          height: 32px;
          object-fit: contain;
          border-radius: 6px;
          background: var(--surface-alt);
          padding: 2px;
        }
        .fs-comp-type {
          font-size: 0.6rem;
          color: var(--text-muted);
          background: var(--surface-alt);
          padding: 2px 6px;
          border-radius: 4px;
          display: inline-block;
          margin-top: 4px;
        }
        .fs-comp-actions {
          display: flex;
          gap: 8px;
          margin-left: 44px; /* alinha com o texto */
        }
        .btn-app-outline {
          border: 1px solid var(--primary-color);
          color: var(--primary-color);
          padding: 6px 12px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 0.75rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 1;
        }
        .btn-app-icon {
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
