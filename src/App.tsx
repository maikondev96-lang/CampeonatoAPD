import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Trophy, Calendar, Table, Activity, Settings, Users, Shield, Menu, X, Sun, Moon, Globe, ChevronDown, Layout, Home as HomeIcon, Star } from 'lucide-react';

// Pages
import Home from './pages/Home';
import TournamentDashboard from './pages/TournamentDashboard';
import Jogos from './pages/Jogos';
import Classificacao from './pages/Classificacao';
import Artilharia from './pages/Artilharia';
import TournamentRosters from './pages/TournamentRosters';
import Fases from './pages/Fases';
import Admin from './pages/Admin'; // Agora é o HUB
import AdminCompetitionDashboard from './pages/AdminCompetitionDashboard';
import AdminTimes from './pages/AdminTimes';
import AdminJogadores from './pages/AdminJogadores';
import AdminJogos from './pages/AdminJogos';
import AdminMatchDetail from './pages/AdminMatchDetail';
import AdminCompetitions from './pages/AdminCompetitions';
import AdminTournamentSettings from './pages/AdminTournamentSettings';
import AdminChampionshipWizard from './pages/AdminChampionshipWizard';
import AdminFases from './pages/AdminFases';
import AdminNews from './pages/AdminNews';
import AdminGroupSorter from './pages/AdminGroupSorter';
import AdminApprovals from './pages/AdminApprovals';
import MatchDetail from './pages/MatchDetail';
import ElencoPublico from './pages/ElencoPublico';
import PublicRegistration from './pages/PublicRegistration';
import TeamProfile from './pages/TeamProfile';
import AdminLogin from './pages/AdminLogin';
import InstitutionalAbout from './pages/InstitutionalAbout';
import InstitutionalHistory from './pages/InstitutionalHistory';
import PlayerRegistration from './pages/PlayerRegistration';

// Components & Context
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import { SeasonProvider, useSeasonContext } from './components/SeasonContext';
import { OrganizationProvider, useOrganizationContext } from './components/OrganizationContext';
import { AdminProvider } from './components/AdminContext';
import { supabase } from './supabaseClient';
import logoApd from './assets/logo.png';
import ScrollToTop from './components/ScrollToTop';

// ─── Season Selector (mini dropdown) ─────────────────────────
const SeasonBadge = () => {
  const { season, seasons, selectSeason } = useSeasonContext();
  const [open, setOpen] = React.useState(false);

  if (!season || seasons.length <= 1) {
    return season ? (
      <span className="season-badge">{season.year}</span>
    ) : null;
  }

  return (
    <div className="season-selector" onClick={() => setOpen(!open)}>
      <span className="season-badge interactive">
        {season.year} <ChevronDown size={12} />
      </span>
      {open && (
        <div className="season-dropdown">
          {seasons.map(s => (
            <button
              key={s.id}
              className={`season-option ${s.id === season.id ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                selectSeason(s.year);
                setOpen(false);
              }}
            >
              {s.year}
              {s.status === 'active' && <span className="season-live">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Navbar ──────────────────────────────────────────────────
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const { organization } = useOrganizationContext();
  const { competition } = useSeasonContext();
  const isAdmin = location.pathname.startsWith('/admin');
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const saved = (localStorage.getItem('apd-theme') as 'light' | 'dark') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('apd-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: newTheme }));
  };

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isInCompetition = competition && location.pathname.includes(`/competitions/${competition.slug}`);

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="nav-logo">
          <Link to="/" className="org-link">
            <img src={organization?.logo_url || logoApd} alt="APD" />
            <div className="logo-text-group">
              <span className="logo-text">{organization?.short_name || 'APD'}</span>
              <div className="logo-subtext">
                {organization?.name || 'Associação Peladeiros de Domingo'}
              </div>
            </div>
          </Link>
        </div>

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          {!isAdmin ? (
            <>
              {isInCompetition ? (
                <>
                  <Link 
                    to={`/competitions/${competition.slug}/${useSeasonContext().season?.year}`} 
                    className={`nav-link-item ${location.pathname.endsWith(`${competition.slug}/${competition.seasons?.[0]?.year}`) ? 'active' : ''}`}
                  >
                    <Layout size={18} /> <span>Dashboard</span>
                  </Link>
                  <Link to={`/competitions/${competition.slug}/${useSeasonContext().season?.year}/jogos`} className={`nav-link-item ${location.pathname.includes('/jogos') ? 'active' : ''}`}>
                    <Calendar size={18} /> <span>Jogos</span>
                  </Link>
                  <Link to={`/competitions/${competition.slug}/${useSeasonContext().season?.year}/classificacao`} className={`nav-link-item ${location.pathname.includes('/classificacao') ? 'active' : ''}`}>
                    <Table size={18} /> <span>Tabela</span>
                  </Link>
                  <Link to={`/competitions/${competition.slug}/${useSeasonContext().season?.year}/elencos`} className={`nav-link-item ${location.pathname.includes('/elencos') ? 'active' : ''}`}>
                    <Users size={18} /> <span>Elencos</span>
                  </Link>
                  <Link to={`/competitions/${competition.slug}/${useSeasonContext().season?.year}/fases`} className={`nav-link-item ${location.pathname.includes('/fases') ? 'active' : ''}`}>
                    <Star size={18} /> <span>Fases</span>
                  </Link>
                  <Link to={`/competitions/${competition.slug}/${useSeasonContext().season?.year}/estatisticas`} className={`nav-link-item ${location.pathname.includes('/estatisticas') ? 'active' : ''}`}>
                    <Activity size={18} /> <span>Estatísticas</span>
                  </Link>
                  <SeasonBadge />
                </>
              ) : (
                <>
                  <Link to="/" className={`nav-link-item ${location.pathname === '/' ? 'active' : ''}`}>
                    <HomeIcon size={18} />
                    <span>Início</span>
                  </Link>
                  <Link to="/sobre" className={`nav-link-item ${location.pathname === '/sobre' ? 'active' : ''}`}>
                    <span>Sobre</span>
                  </Link>
                  <Link to="/historia" className={`nav-link-item ${location.pathname === '/historia' ? 'active' : ''}`}>
                    <span>História</span>
                  </Link>
                </>
              )}
              <button onClick={toggleTheme} className="nav-theme-btn">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <Link to="/admin" className="nav-admin-link">
                <Settings size={18} />
              </Link>
            </>
          ) : (
            <>
              {location.pathname !== '/admin/login' && (
                <>
                  <Link to="/admin" className={`nav-link-item ${location.pathname === '/admin' ? 'active' : ''}`}>
                    <Globe size={18} /> <span>Hub Admin</span>
                  </Link>
                  <button onClick={handleLogout} className="nav-logout-btn">Sair</button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const { competition } = useSeasonContext();
  const seasonYear = useSeasonContext().season?.year;
  const isAdmin = location.pathname.startsWith('/admin');

  if (isAdmin || location.pathname === '/admin/login') return null;

  const isInCompetition = competition && location.pathname.includes(`/competitions/${competition.slug}`);

  if (isInCompetition) {
    const basePath = `/competitions/${competition.slug}/${seasonYear}`;
    const isDashboard = location.pathname === basePath || location.pathname === `/competitions/${competition.slug}`;
    
    return (
      <nav className="bottom-nav">
        <Link to={basePath} className={isDashboard ? 'active' : ''}>
          <Layout size={20} />
          <span>Início</span>
        </Link>
        <Link to={`${basePath}/jogos`} className={location.pathname.includes('/jogos') ? 'active' : ''}>
          <Calendar size={20} />
          <span>Jogos</span>
        </Link>
        <Link to={`${basePath}/classificacao`} className={location.pathname.includes('/classificacao') ? 'active' : ''}>
          <Table size={20} />
          <span>Tabela</span>
        </Link>
        <Link to={`${basePath}/elencos`} className={location.pathname.includes('/elencos') ? 'active' : ''}>
          <Users size={20} />
          <span>Elencos</span>
        </Link>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav">
      <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
        <HomeIcon size={20} />
        <span>Início</span>
      </Link>
      <Link to="/sobre" className={location.pathname === '/sobre' ? 'active' : ''}>
        <Star size={20} />
        <span>Sobre</span>
      </Link>
      <Link to="/historia" className={location.pathname === '/historia' ? 'active' : ''}>
        <Trophy size={20} />
        <span>História</span>
      </Link>
    </nav>
  );
};

const CompetitionWrapper = ({ children }: { children: React.ReactNode }) => {
  const { slug, year } = useParams<{ slug: string; year?: string }>();
  const { selectCompetition } = useSeasonContext();
  
  React.useEffect(() => { 
    if (slug) {
      selectCompetition(slug, year ? parseInt(year) : undefined);
    }
  }, [slug, year, selectCompetition]);

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <OrganizationProvider>
        <SeasonProvider>
          <div className="app-container">
            <Navbar />
            <main className="app-main">
              <Routes>
                {/* Portal Institutional */}
                <Route path="/" element={<Home />} />
                <Route path="/admin/new-championship" element={<AdminRoute><AdminChampionshipWizard /></AdminRoute>} />
                <Route path="/admin/news" element={<AdminRoute><AdminNews /></AdminRoute>} />
                <Route path="/sobre" element={<InstitutionalAbout />} />
                <Route path="/historia" element={<InstitutionalHistory />} />
                
                {/* Competition Context Routes */}
                <Route path="/competitions/:slug/:year?" element={<CompetitionWrapper><TournamentDashboard /></CompetitionWrapper>} />
                <Route path="/competitions/:slug/:year?/jogos" element={<CompetitionWrapper><Jogos /></CompetitionWrapper>} />
                <Route path="/competitions/:slug/:year?/jogos/:id" element={<CompetitionWrapper><MatchDetail /></CompetitionWrapper>} />
                <Route path="/competitions/:slug/:year?/classificacao" element={<CompetitionWrapper><Classificacao /></CompetitionWrapper>} />
                <Route path="/competitions/:slug/:year?/estatisticas" element={<CompetitionWrapper><Artilharia /></CompetitionWrapper>} />
                <Route path="/competitions/:slug/:year?/elencos" element={<CompetitionWrapper><TournamentRosters /></CompetitionWrapper>} />
                <Route path="/competitions/:slug/:year?/fases" element={<CompetitionWrapper><Fases /></CompetitionWrapper>} />
                
                {/* Public Registration & Profiles */}
                <Route path="/register/:token" element={<PublicRegistration />} />
                <Route path="/join/team/:inviteToken" element={<PlayerRegistration />} />
                <Route path="/time/:id" element={<TeamProfile />} />
                <Route path="/elenco/:token" element={<ElencoPublico />} />
                
                {/* Admin Public Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />

                {/* Admin Protected Routes */}
                <Route element={<AdminRoute />}>
                   {/* HUB Administrativo (Seletor de Campeonatos) */}
                   <Route path="/admin" element={<Admin />} />
                   
                   {/* Contextual Admin Routes (Nested under AdminLayout) */}
                   <Route path="/admin/:slug/:year" element={<AdminProvider><AdminLayout /></AdminProvider>}>
                      <Route index element={<AdminCompetitionDashboard />} />
                      <Route path="jogos" element={<AdminJogos />} />
                      <Route path="jogos/:id" element={<AdminMatchDetail />} />
                      <Route path="times" element={<AdminTimes />} />
                      <Route path="jogadores" element={<AdminJogadores />} />
                      <Route path="fases" element={<AdminFases />} />
                      <Route path="sorteio" element={<AdminGroupSorter />} />
                      <Route path="inscricoes" element={<AdminApprovals />} />
                      <Route path="settings" element={<AdminTournamentSettings />} />
                   </Route>
                </Route>
              </Routes>
            </main>
            <BottomNav />
          </div>
        </SeasonProvider>
      </OrganizationProvider>
    </Router>
  );
}

export default App;
