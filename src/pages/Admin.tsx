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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 className="section-title" style={{ margin: 0 }}>
             <Globe /> HUB ADMINISTRATIVO
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {organization?.name} — Gestão Multi-Competição
          </p>
        </div>
        <Link to="/admin/new-championship" className="btn btn-primary">
          <Plus size={18} /> Novo Campeonato
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {competitions.map((comp) => {
          const activeSeason = comp.seasons?.find(s => s.status === 'active') || comp.seasons?.[0];
          
          return (
            <div key={comp.id} className="premium-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--surface-alt)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '1.5rem', overflow: 'hidden' }}>
                  <img src={comp.logo_url || logoApd} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span style={{ 
                     fontSize: '0.6rem', 
                     fontWeight: 900, 
                     padding: '2px 8px', 
                     borderRadius: '20px', 
                     background: comp.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(100,116,139,0.1)',
                     color: comp.is_active ? 'var(--success)' : 'var(--text-muted)',
                     textTransform: 'uppercase'
                   }}>
                     {comp.is_active ? 'Ativo' : 'Arquivado'}
                   </span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 950, marginBottom: '0.5rem' }}>{comp.name}</h3>
              
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Layers size={14} /> Temporada {activeSeason?.year || 'N/A'}
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Activity size={14} /> {comp.type.toUpperCase()}
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Link to={`/admin/${comp.slug}/${activeSeason?.year || 2026}`} className="btn btn-primary" style={{ width: '100%', fontSize: '0.8rem' }}>
                  Gerenciar
                </Link>
                <Link to={`/admin/competitions`} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>
                  Configurar
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER HUB */}
      <div style={{ marginTop: '4rem', padding: '2rem', background: 'var(--surface-alt)', borderRadius: '16px', textAlign: 'center' }}>
         <Settings size={32} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
         <h4 style={{ fontWeight: 900 }}>Configurações da Organização</h4>
         <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            Edite a identidade visual, logo e cores globais da {organization?.short_name || 'Associação'}.
         </p>
         <button className="btn btn-secondary">Acessar Configurações Globais</button>
      </div>

      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
         <Link to="/admin/news" className="premium-card card-hover" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)' }}>
               <Globe size={20} />
            </div>
            <div style={{ flex: 1 }}>
               <h4 style={{ fontWeight: 900, fontSize: '0.9rem' }}>Motor de Notícias (GE)</h4>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Publique destaques e novidades na Home.</p>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
         </Link>
      </div>
    </div>
  );
}
