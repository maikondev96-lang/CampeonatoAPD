import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, Calendar, Users, ArrowRight, ChevronRight, Newspaper, Activity, Globe, Shield, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../components/OrganizationContext';
import logoApd from '../assets/logo.png';
import { getSmartData } from '../utils/smartCache';
import { createPortal } from 'react-dom';

// SUB-COMPONENTE NEWS MODAL (PROFISSIONAL)
const NewsModal = ({ news, onClose }: { news: any, onClose: () => void }) => {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal-content" onClick={e => e.stopPropagation()}>
        <button className="news-modal-close-top" onClick={onClose}><X size={24}/></button>
        
        <div className="news-modal-hero">
          <div className="news-modal-hero-bg" style={{ backgroundImage: `url(${news.image_url})` }} />
          <img src={news.image_url} alt="" className="news-modal-img" />
        </div>

        <div className="news-modal-body">
          <span className="news-modal-category">{news.category || 'NOTÍCIA'}</span>
          <h2 className="news-modal-title">{news.title}</h2>
          <div className="news-modal-text">{news.content}</div>
        </div>

        <div className="news-modal-footer">
          <button className="news-modal-close-btn" onClick={onClose}>VOLTAR AO FEED</button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default function Home() {
  const { organization } = useOrganizationContext();
  const [news, setNews] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [stats, setStats] = useState({ teams: 32, players: 450, matches: 1200 });
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<any>(null);

  useEffect(() => {
    fetchHomeData();
  }, []);
  
  useEffect(() => {
    if (selectedNews) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedNews]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // 1. Usa SmartCache para carregar os dados da Home (composite)
      const data = await getSmartData('home_data', async () => {
        const [newsRes, compRes, teamsCount, playersCount, matchesCount] = await Promise.all([
          supabase.from('news').select('*').eq('is_published', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(6),
          supabase.from('competitions').select('*, seasons(year, status)').eq('is_active', true),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('matches').select('*', { count: 'exact', head: true })
        ]);

        return {
          news: newsRes.data || [],
          competitions: compRes.data || [],
          stats: {
            teams: teamsCount.count || 32,
            players: playersCount.count || 450,
            matches: matchesCount.count || 1200
          }
        };
      });
      
      setNews(data.news);
      setCompetitions(data.competitions);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const featuredNews = news.find(n => n.is_featured) || news[0];
  const sideNews = news.filter(n => n.id !== featuredNews?.id);

  if (!organization || loading) {
    return (
      <div className="home-loading-compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Activity className="animate-spin" color="var(--primary-color)" size={32} />
      </div>
    );
  }

  return (
    <div className="home-dashboard animate-fade">
      <div className="dashboard-container">
        
        {/* HERO & STATS REMOVIDOS PARA DAR ESPAÇO AO PADRÃO APP (Podem ser movidos para uma tab específica se necessário) */}
        {/* A Home agora foca diretamente em Notícias e Campeonatos, imitando a tela inicial de um app */}
        
        {/* ROW 2: MAIN CONTENT (NEWS & COMPS) */}
        <div className="dashboard-row main-content-row">
          
          {/* COLUNA ESQUERDA: NOTÍCIAS */}
          <main className="fs-news-section">
            <div className="fs-tabs-scroll">
              <span className="fs-tab active">TODOS</span>
              <span className="fs-tab">FUTEBOL</span>
              <span className="fs-tab">DESTAQUES</span>
              <span className="fs-tab">COMUNICADOS</span>
            </div>
            
            {featuredNews && (
              <div className="fs-hero-news" onClick={() => setSelectedNews(featuredNews)}>
                <img src={featuredNews.image_url} alt="" className="fs-hero-img" />
                <div className="fs-hero-content">
                  <h3 className="fs-hero-title">{featuredNews.title}</h3>
                  <span className="fs-hero-time">Há 2 horas</span>
                </div>
              </div>
            )}

            <div className="fs-news-list">
              {sideNews.slice(0, 5).map(item => (
                <div key={item.id} className="fs-news-item" onClick={() => setSelectedNews(item)}>
                  <img src={item.image_url} alt="" className="fs-news-thumb" />
                  <div className="fs-news-info">
                    <h4 className="fs-news-title">{item.title}</h4>
                    <span className="fs-news-time">Há 4 horas</span>
                  </div>
                </div>
              ))}
            </div>
          </main>

          {/* COLUNA DIREITA: CAMPEONATOS */}
          <aside className="fs-comps-section" id="comp-grid">
            <div className="fs-section-header">COMPETIÇÕES FAVORITAS</div>
            <div className="fs-comps-list">
              {competitions.map(comp => {
                const activeSeason = comp.seasons?.find((s: any) => s.status === 'active') || comp.seasons?.[0];
                return (
                  <Link to={activeSeason ? `/competitions/${comp.slug}/${activeSeason.year}` : '#'} key={comp.id} className="fs-comp-item">
                    <img src={comp.logo_url || logoApd} alt="" className="fs-comp-logo" />
                    <div className="fs-comp-details">
                      <span className="fs-comp-country">BRASIL</span>
                      <h3 className="fs-comp-name">{comp.name} {activeSeason?.year}</h3>
                    </div>
                  </Link>
                );
              })}
              {competitions.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>Nenhum campeonato.</div>}
            </div>
          </aside>

        </div>
      </div>

      {/* MODAL DE NOTÍCIA VIA PORTAL */}
      {selectedNews && (
        <NewsModal 
          news={selectedNews} 
          onClose={() => setSelectedNews(null)} 
        />
      )}

      <style>{`
        .home-dashboard {
          padding: 16px;
          width: 100%;
        }

        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* GRID BASE */
        .dashboard-row {
          display: grid;
          gap: 24px;
          width: 100%;
        }

        /* HERO + STATS */
        .top-row {
          grid-template-columns: 2fr 1fr;
          align-items: stretch;
        }

        /* MAIN */
        .main-content-row {
          grid-template-columns: 2fr 1fr;
          align-items: stretch;
        }

        /* HERO */
        .hero-compact {
          background: #0f172a;
          border-radius: 20px;
          padding: 24px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          width: 100%;
        }
        .hero-brand-inline { display: flex; align-items: center; gap: 1rem; }
        .hero-logo-small { width: 50px; height: 50px; background: white; border-radius: 50%; padding: 5px; }
        .hero-text-small h1 { font-size: 1.25rem; font-weight: 950; margin: 0; }
        .hero-text-small p { font-size: 0.75rem; opacity: 0.5; margin: 0; }
        .btn-quick { background: var(--primary-color); border: none; padding: 0.5rem 1rem; border-radius: 10px; font-weight: 950; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        /* STATS */
        .stats-compact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          width: 100%;
        }
        .mini-stat-card { background: white; border-radius: 20px; padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
        .mini-stat-card .stat-val { font-size: 1.25rem; font-weight: 950; color: #0f172a; margin: 5px 0 2px; }
        .mini-stat-card .stat-lbl { font-size: 0.6rem; font-weight: 800; color: #64748b; letter-spacing: 1px; }
        .icon-green { color: #16a34a; } .icon-yellow { color: #d97706; } .icon-blue { color: #0284c7; }

        /* FS NEWS SECTION */
        .fs-news-section {
          background: var(--card-bg);
          width: 100%;
          border-bottom: 1px solid var(--border-color);
        }

        .fs-tabs-scroll {
          display: flex;
          overflow-x: auto;
          white-space: nowrap;
          border-bottom: 1px solid var(--border-color);
          padding: 0 16px;
        }
        .fs-tabs-scroll::-webkit-scrollbar { display: none; }
        
        .fs-tab {
          padding: 12px 16px;
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          cursor: pointer;
          border-bottom: 3px solid transparent;
        }
        .fs-tab.active {
          color: var(--accent-color);
          border-bottom-color: var(--accent-color);
        }

        .fs-hero-news {
          padding: 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
        }
        .fs-hero-img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 12px;
        }
        .fs-hero-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .fs-hero-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .fs-news-list {
          display: flex;
          flex-direction: column;
        }
        .fs-news-item {
          display: flex;
          padding: 12px 16px;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          text-decoration: none;
        }
        .fs-news-item:last-child { border-bottom: none; }
        .fs-news-thumb {
          width: 80px;
          height: 60px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .fs-news-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .fs-news-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 4px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .fs-news-time {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        /* FS COMPS SECTION */
        .fs-comps-section {
          background: var(--card-bg);
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .fs-section-header {
          background: var(--secondary-color);
          padding: 6px 16px;
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--primary-dark);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border-color);
          border-top: 1px solid var(--border-color);
        }

        .fs-comps-list {
          display: flex;
          flex-direction: column;
        }

        .fs-comp-item {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          text-decoration: none;
          color: inherit;
        }
        .fs-comp-item:last-child { border-bottom: none; }
        .fs-comp-item:hover { background: var(--card-hover); }

        .fs-comp-logo {
          width: 20px;
          height: 20px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .fs-comp-details {
          display: flex;
          flex-direction: column;
        }
        .fs-comp-country {
          font-size: 0.6rem;
          color: var(--text-muted);
          text-transform: uppercase;
          line-height: 1;
          margin-bottom: 2px;
        }
        .fs-comp-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
          line-height: 1;
        }

        /* MODAL (removido localmente, agora usa Portal) */

        /* RESPONSIVO REAL */
        @media (max-width: 1200px) {
          .top-row,
          .main-content-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .home-dashboard {
            padding: 0;
            background: var(--bg-color);
          }
          .dashboard-container {
            gap: 0; /* Stack sections tightly */
          }
          
          .main-content-row {
            gap: 16px;
            background: var(--bg-color);
          }
        }

          .hero-compact {
            flex-direction: column;
            align-items: flex-start;
          }

          .stats-compact-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .featured-card-compact {
            height: 240px;
          }
        }
      `}</style>
    </div>
  );
}
