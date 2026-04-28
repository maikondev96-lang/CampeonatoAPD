import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Calendar, Table, Activity, Settings, Users, Shield } from 'lucide-react';
import Home from './pages/Home';
import Jogos from './pages/Jogos';
import Classificacao from './pages/Classificacao';
import Artilharia from './pages/Artilharia';
import Fases from './pages/Fases';
import Admin from './pages/Admin';
import AdminTimes from './pages/AdminTimes';
import AdminJogadores from './pages/AdminJogadores';
import AdminJogos from './pages/AdminJogos';
import AdminMatchDetail from './pages/AdminMatchDetail';
import MatchDetail from './pages/MatchDetail';
import logoApd from './assets/logo.png';

import AdminLogin from './pages/AdminLogin';
import AdminRoute from './components/AdminRoute';

const Navbar = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdminAuthenticated');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-content">
        <Link to="/" className="nav-logo">
          <img src={logoApd} alt="APD" />
          <div className="logo-text-group">
            <span className="logo-text">Copa do Mundo <span className="text-highlight">APD</span></span>
            <div className="logo-subtext">Futebol amador de nível mundial</div>
          </div>
        </Link>
        <div className="nav-links">
          {!isAdmin ? (
            <>
              <Link to="/jogos" className={`nav-link-item ${location.pathname === '/jogos' ? 'active' : ''}`}>
                <Calendar size={18} />
                <span>Jogos</span>
              </Link>
              <Link to="/classificacao" className={`nav-link-item ${location.pathname === '/classificacao' ? 'active' : ''}`}>
                <Table size={18} />
                <span>Tabela</span>
              </Link>
              <Link to="/fases" className={`nav-link-item ${location.pathname === '/fases' ? 'active' : ''}`}>
                <Trophy size={18} />
                <span>Fases</span>
              </Link>
              <Link to="/artilharia" className={`nav-link-item ${location.pathname === '/artilharia' ? 'active' : ''}`}>
                <Activity size={18} />
                <span>Estatísticas</span>
              </Link>
              <Link to="/admin" className="nav-admin-link">
                <Settings size={18} />
              </Link>
            </>
          ) : (
            <>
              {location.pathname !== '/admin/login' && (
                <>
                  <Link to="/admin/times" className={`nav-link-item ${location.pathname === '/admin/times' ? 'active' : ''}`}>
                    <Shield size={18} /> <span>Times</span>
                  </Link>
                  <Link to="/admin/jogadores" className={`nav-link-item ${location.pathname === '/admin/jogadores' ? 'active' : ''}`}>
                    <Users size={18} /> <span>Jogadores</span>
                  </Link>
                  <Link to="/admin/jogos" className={`nav-link-item ${location.pathname === '/admin/jogos' ? 'active' : ''}`}>
                    <Calendar size={18} /> <span>Jogos</span>
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

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/jogos" element={<Jogos />} />
            <Route path="/jogos/:id" element={<MatchDetail />} />
            <Route path="/classificacao" element={<Classificacao />} />
            <Route path="/artilharia" element={<Artilharia />} />
            <Route path="/fases" element={<Fases />} />
            
            {/* Admin Public Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Protected Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/times" element={<AdminTimes />} />
              <Route path="/admin/jogadores" element={<AdminJogadores />} />
              <Route path="/admin/jogos" element={<AdminJogos />} />
              <Route path="/admin/jogos/:id" element={<AdminMatchDetail />} />
            </Route>
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
