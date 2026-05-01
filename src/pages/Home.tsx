import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, Calendar, Users, ArrowRight, ChevronRight, Newspaper, Activity, Globe, Shield, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../components/OrganizationContext';
import logoApd from '../assets/logo.png';

export default function Home() {
  const { organization } = useOrganizationContext();
  const [news, setNews] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState<any>(null);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [newsRes, compRes] = await Promise.all([
        supabase.from('news').select('*').eq('is_published', true).order('is_featured', { ascending: false }).order('created_at', { ascending: false }).limit(6),
        supabase.from('competitions').select('*, seasons(year, status)').eq('is_active', true)
      ]);
      if (newsRes.data) setNews(newsRes.data);
      if (compRes.data) setCompetitions(compRes.data);
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
        
        {/* ROW 1: HERO & STATS */}
        <div className="dashboard-row top-row">
          <section className="hero-compact">
            <div className="hero-brand-inline">
              <img src={organization.logo_url || logoApd} alt="" className="hero-logo-small" />
              <div className="hero-text-small">
                <h1>{organization.name}</h1>
                <p>Portal Oficial das Competições</p>
              </div>
            </div>
            <div className="hero-quick-actions">
               <button className="btn-quick" onClick={() => document.getElementById('comp-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                 <Trophy size={16} /> CAMPEONATOS
               </button>
            </div>
          </section>

          <section className="stats-compact-grid">
            <div className="mini-stat-card">
              <Shield size={18} className="icon-green" />
              <div className="stat-val">32</div>
              <div className="stat-lbl">TIMES</div>
            </div>
            <div className="mini-stat-card">
              <Users size={18} className="icon-yellow" />
              <div className="stat-val">450+</div>
              <div className="stat-lbl">ATLETAS</div>
            </div>
            <div className="mini-stat-card">
              <Activity size={18} className="icon-blue" />
              <div className="stat-val">1.2k</div>
              <div className="stat-lbl">JOGOS</div>
            </div>
          </section>
        </div>

        {/* ROW 2: MAIN CONTENT (NEWS & COMPS) */}
        <div className="dashboard-row main-content-row">
          
          {/* COLUNA ESQUERDA: NOTÍCIAS */}
          <main className="news-bento">
            <div className="bento-label"><Newspaper size={14} /> DESTAQUES DO PORTAL</div>
            
            {featuredNews && (
              <div className="featured-card-compact" onClick={() => setSelectedNews(featuredNews)}>
                <div className="featured-img-box">
                  <img src={featuredNews.image_url} alt="" />
                  <div className="featured-overlay">
                    <span className="featured-tag">{featuredNews.category}</span>
                    <h3>{featuredNews.title}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="news-list-compact">
              {sideNews.slice(0, 4).map(item => (
                <div key={item.id} className="news-item-row" onClick={() => setSelectedNews(item)}>
                  <img src={item.image_url} alt="" />
                  <div className="news-item-info">
                    <span className="item-tag">{item.category}</span>
                    <h4>{item.title}</h4>
                  </div>
                  <ChevronRight size={14} className="arrow" />
                </div>
              ))}
            </div>
          </main>

          {/* COLUNA DIREITA: CAMPEONATOS */}
          <aside className="comps-bento" id="comp-grid">
            <div className="bento-label"><Trophy size={14} /> CAMPEONATOS ATIVOS</div>
            <div className="comps-list-vertical">
              {competitions.map(comp => {
                const activeSeason = comp.seasons?.find((s: any) => s.status === 'active') || comp.seasons?.[0];
                return (
                  <Link to={activeSeason ? `/competitions/${comp.slug}/${activeSeason.year}` : '#'} key={comp.id} className="comp-item-card">
                    <div className="comp-logo-mini">
                      <img src={comp.logo_url || logoApd} alt="" />
                    </div>
                    <div className="comp-details">
                      <h3>{comp.name}</h3>
                      <div className="comp-badge-row">
                        <span className="badge-year">{activeSeason?.year}</span>
                        <span className={`badge-status ${activeSeason?.status === 'active' ? 'active' : ''}`}>
                          {activeSeason?.status === 'active' ? '● AO VIVO' : 'ENCERRADO'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight size={16} className="go-icon" />
                  </Link>
                );
              })}
              {competitions.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.8rem' }}>Nenhum campeonato ativo.</div>}
            </div>

            <div className="about-card-compact" style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
               <Info size={16} style={{ color: '#64748b', marginTop: '2px' }} />
               <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{organization.description || "O portal oficial das maiores competições de futebol amador."}</p>
            </div>
          </aside>

        </div>
      </div>

      {/* MODAL DE NOTÍCIA */}
      {selectedNews && (
        <div className="modal-overlay" onClick={() => setSelectedNews(null)}>
           <div className="news-modal-compact" onClick={e => e.stopPropagation()} style={{ background: 'white', width: '90%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '24px', overflowY: 'auto', position: 'relative' }}>
              <button className="modal-close" onClick={() => setSelectedNews(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}><X size={20}/></button>
              <div className="modal-img-box">
                <div 
                  className="modal-img-bg"
                  style={{ backgroundImage: `url(${selectedNews.image_url})` }}
                />
                <img src={selectedNews.image_url} alt="" className="modal-img-main" />
              </div>
              <div className="modal-content" style={{ padding: '3rem' }}>
                <span className="modal-tag" style={{ color: 'var(--primary-color)', fontWeight: 950, fontSize: '0.75rem', textTransform: 'uppercase' }}>{selectedNews.category}</span>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 950, margin: '1rem 0 2rem', lineHeight: 1.1 }}>{selectedNews.title}</h2>
                <div className="modal-body-text" style={{ lineHeight: 1.8, fontSize: '1.1rem', whiteSpace: 'pre-wrap', color: '#334155' }}>{selectedNews.content}</div>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .home-dashboard {
          background: #f1f5f9;
          min-height: 100vh;
          padding: 24px;
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

        /* CARDS PADRÃO */
        .news-bento,
        .comps-bento {
          background: white;
          border-radius: 24px;
          padding: 24px;
          width: 100%;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }

        .bento-label { font-size: 0.65rem; font-weight: 950; color: #64748b; letter-spacing: 1.5px; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px; text-transform: uppercase; }

        /* FEATURED */
        .featured-card-compact {
          width: 100%;
          height: 320px;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          margin-bottom: 20px;
          position: relative;
        }
        .featured-img-box { width: 100%; height: 100%; }
        .featured-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .featured-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; flex-direction: column; justify-content: flex-end; padding: 1.5rem; color: white; }
        .featured-tag { background: var(--primary-color); color: black; font-weight: 950; font-size: 0.6rem; padding: 3px 8px; border-radius: 5px; width: fit-content; margin-bottom: 0.5rem; }
        .featured-overlay h3 { font-size: 1.5rem; font-weight: 950; margin: 0; line-height: 1.1; }

        /* LISTA */
        .news-list-compact {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .news-item-row { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; border-radius: 12px; cursor: pointer; transition: background 0.2s; }
        .news-item-row:hover { background: #f8fafc; }
        .news-item-row img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; }
        .news-item-info { flex: 1; }
        .item-tag { font-size: 0.55rem; font-weight: 900; color: var(--primary-color); text-transform: uppercase; }
        .news-item-info h4 { font-size: 0.85rem; font-weight: 850; margin: 2px 0 0; color: #0f172a; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .news-item-row .arrow { opacity: 0.2; }
        .news-item-row:hover .arrow { opacity: 1; transform: translateX(3px); color: var(--primary-color); }

        /* COMPS */
        .comps-list-vertical {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        /* ITEM */
        .comp-item-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s;
        }
        .comp-item-card:hover {
          transform: translateX(4px);
          border-color: var(--primary-color);
          background: white;
        }
        .comp-logo-mini { width: 40px; height: 40px; background: white; border-radius: 10px; padding: 5px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .comp-logo-mini img { width: 100%; height: 100%; object-fit: contain; }
        .comp-details h3 { font-size: 0.9rem; font-weight: 950; margin: 0; color: #0f172a; }
        .comp-badge-row { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
        .badge-year { font-size: 0.65rem; font-weight: 800; color: #64748b; }
        .badge-status { font-size: 0.6rem; font-weight: 950; color: #94a3b8; }
        .badge-status.active { color: #16a34a; }
        .go-icon { opacity: 0.2; color: var(--primary-color); }
        .comp-item-card:hover .go-icon { opacity: 1; }

        /* MODAL (corrigido) */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          backdrop-filter: blur(4px);
        }

        .modal-img-box {
          position: relative;
          width: 100%;
          height: 400px;
          overflow: hidden;
          background: #000;
        }

        .modal-img-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(30px) brightness(0.6);
          transform: scale(1.2);
          opacity: 0.8;
        }

        .modal-img-main {
          position: relative;
          width: 100%;
          height: 100%;
          object-fit: contain;
          z-index: 2;
        }

        /* RESPONSIVO REAL */
        @media (max-width: 1200px) {
          .top-row,
          .main-content-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .home-dashboard {
            padding: 16px;
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
