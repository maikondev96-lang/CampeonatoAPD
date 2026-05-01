import React from 'react';
import { Link, useLocation, Outlet, useParams } from 'react-router-dom';
import { useAdminContext } from './AdminContext';
import { 
  LayoutDashboard, Settings, Users, UserSquare2, 
  Calendar, Trophy, ClipboardList, History, 
  ChevronLeft, Loader2, ExternalLink, Shield
} from 'lucide-react';

const AdminLayout = () => {
  const { activeCompetition, activeSeason, loading } = useAdminContext();
  const location = useLocation();
  const { slug, year } = useParams();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}>
       <Loader2 className="animate-spin" /> Carregando contexto...
    </div>
  );

  if (!activeCompetition && slug) return (
    <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
       <h2>Campeonato não encontrado</h2>
       <Link to="/admin" className="btn btn-primary">Voltar ao Hub</Link>
    </div>
  );

  // Se não tem slug, estamos no Hub (Admin principal), então apenas renderiza o Outlet
  if (!slug) return <Outlet />;

  const menuItems = [
    { label: 'Painel', icon: LayoutDashboard, path: `/admin/${slug}/${year}` },
    { label: 'Jogos', icon: Calendar, path: `/admin/${slug}/${year}/jogos` },
    { label: 'Times e Elencos', icon: Shield, path: `/admin/${slug}/${year}/times` },
    { label: 'Jogadores', icon: UserSquare2, path: `/admin/${slug}/${year}/jogadores` },
    { label: 'Fases e Sorteio', icon: Trophy, path: `/admin/${slug}/${year}/fases` },
    { label: 'Inscrições', icon: ClipboardList, path: `/admin/${slug}/${year}/inscricoes` },
    { label: 'Configurações', icon: Settings, path: `/admin/${slug}/${year}/settings` },
  ];

  return (
    <div className="admin-layout-root">
      {/* Sidebar Contextual */}
      <aside className="admin-sidebar">
        <div className="sidebar-header-box">
          <Link to="/admin" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            color: 'var(--text-muted)',
            marginBottom: '1.5rem',
            textDecoration: 'none'
          }}>
            <ChevronLeft size={16} /> VOLTAR AO HUB
          </Link>

          <div style={{ marginBottom: '2rem' }}>
             <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '4px' }}>Gerenciando</div>
             <div style={{ fontSize: '1rem', fontWeight: 950 }}>{activeCompetition?.name}</div>
             <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Temporada {activeSeason?.year}</div>
          </div>
        </div>

        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: isActive ? 'var(--primary-color)' : 'var(--text-main)',
                background: isActive ? 'var(--primary-light)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="sidebar-header-box" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
           <Link to={`/competitions/${slug}`} target="_blank" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.75rem', gap: '8px' }}>
              Ver Site Público <ExternalLink size={14} />
           </Link>
        </div>
      </aside>

      {/* Conteúdo Contextual */}
      <main className="admin-main">
         <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
