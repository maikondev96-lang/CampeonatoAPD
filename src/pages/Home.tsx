import React, { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, ArrowRight, ChevronRight, Newspaper, Activity, Globe, Shield, X, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrganizationContext } from '../components/OrganizationContext';
import logoApd from '../assets/logo.png';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

// SUB-COMPONENTE NEWS MODAL
const NewsModal = ({ news, onClose }: { news: any, onClose: () => void }) => {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return null;

  return createPortal(
    <div className="news-modal-overlay" onClick={onClose}>
      <div className="news-modal-content" onClick={e => e.stopPropagation()}>
        <button className="news-modal-close-top" onClick={onClose}><X size={24}/></button>
        <div className="news-modal-hero">
          <div className="news-modal-hero-bg" style={{ backgroundImage: `url(${news.image_url})` }} />
          <img src={news.image_url} alt="" className="news-modal-img" loading="lazy" />
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
  // organization é APENAS para exibição (logo/nome). Nunca bloqueia o render.
  const { organization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [selectedNews, setSelectedNews] = useState<any>(null);

  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/news');
        const isJson = res.ok && res.headers.get('content-type')?.includes('application/json');
        if (isJson) return res.json();
      } catch (_) { /* API offline */ }
      // Fallback: busca direto no Supabase
      const { data } = await supabase.from('news').select('*').order('created_at', { ascending: false });
      return data ?? [];
    }
  });

  const { data: competitions, isLoading: compsLoading } = useQuery({
    queryKey: ['competitions'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/competitions');
        const isJson = res.ok && res.headers.get('content-type')?.includes('application/json');
        if (isJson) return res.json();
      } catch (_) { /* API offline */ }
      // Fallback: busca direto no Supabase
      const { data } = await supabase.from('competitions').select('*, seasons(*)').order('created_at', { ascending: false });
      return data ?? [];
    }
  });

  useEffect(() => {
    document.body.style.overflow = selectedNews ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedNews]);

  const prefetchDashboard = (seasonId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['dashboard', seasonId],
      queryFn: async () => {
        try {
          const res = await fetch(`/api/dashboard?season_id=${seasonId}`);
          if (res.ok) return res.json();
        } catch (_) { /* silencioso */ }
        return null;
      },
      staleTime: 1000 * 60 * 5
    });
  };

  // Bloqueia render APENAS se os dados reais ainda não chegaram.
  // organization nunca bloqueia — ela é opcional para exibição.
  if (newsLoading && compsLoading) {
    return (
      <div className="home-loading-compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Activity className="animate-spin" color="var(--primary-color)" size={32} />
      </div>
    );
  }

  const featuredNews = news?.find((n: any) => n.is_featured) || news?.[0];
  const sideNews = news?.filter((n: any) => n.id !== featuredNews?.id) || [];

  return (
    <div className="home-dashboard animate-fade" style={{ willChange: 'transform' }}>
      <div className="dashboard-container">
        <div className="dashboard-row main-content-row">
          <main className="fs-news-section">
            <div className="fs-tabs-scroll">
              <span className="fs-tab active">TODOS</span>
              <span className="fs-tab">FUTEBOL</span>
              <span className="fs-tab">DESTAQUES</span>
            </div>
            {featuredNews && (
              <div className="fs-hero-news" onClick={() => setSelectedNews(featuredNews)}>
                <img src={featuredNews.image_url} alt="" className="fs-hero-img" loading="lazy" />
                <div className="fs-hero-content">
                  <h3 className="fs-hero-title">{featuredNews.title}</h3>
                </div>
              </div>
            )}
            <div className="fs-news-list">
              {sideNews.slice(0, 5).map((item: any) => (
                <div key={item.id} className="fs-news-item" onClick={() => setSelectedNews(item)}>
                  <img src={item.image_url} alt="" className="fs-news-thumb" loading="lazy" />
                  <div className="fs-news-info">
                    <h4 className="fs-news-title">{item.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </main>

          <aside className="fs-comps-section">
            <div className="fs-section-header">COMPETIÇÕES ATIVAS</div>
            <div className="fs-comps-list">
              {competitions?.map((comp: any) => {
                const activeSeason = comp.seasons?.find((s: any) => s.status === 'active') || comp.seasons?.[0];
                return (
                  <Link 
                    to={activeSeason ? `/competitions/${comp.slug}/${activeSeason.year}` : '#'} 
                    key={comp.id} 
                    className="fs-comp-item"
                    onMouseEnter={() => activeSeason && prefetchDashboard(activeSeason.id)}
                    onTouchStart={() => activeSeason && prefetchDashboard(activeSeason.id)}
                  >
                    <img src={comp.logo_url || logoApd} alt="" className="fs-comp-logo" loading="lazy" width="24" height="24" />
                    <div className="fs-comp-details">
                      <span className="fs-comp-country">BRASIL</span>
                      <h3 className="fs-comp-name">{comp.name} {activeSeason?.year}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      {selectedNews && <NewsModal news={selectedNews} onClose={() => setSelectedNews(null)} />}

      <style>{`
        .home-dashboard { padding: 16px; width: 100%; overflow-x: hidden; }
        .dashboard-container { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        .dashboard-row { display: grid; gap: 24px; width: 100%; }
        .main-content-row { grid-template-columns: 2fr 1fr; align-items: stretch; }
        .fs-news-section { background: var(--card-bg); border-radius: 12px; overflow: hidden; }
        .fs-tabs-scroll { display: flex; overflow-x: auto; border-bottom: 1px solid var(--border-color); padding: 0 16px; }
        .fs-tab { padding: 12px 16px; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); cursor: pointer; }
        .fs-tab.active { color: var(--accent-color); border-bottom: 3px solid var(--accent-color); }
        .fs-hero-news { padding: 16px; cursor: pointer; border-bottom: 1px solid var(--border-color); }
        .fs-hero-img { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; }
        .fs-hero-title { font-size: 1.2rem; font-weight: 800; margin-top: 12px; }
        .fs-news-item { display: flex; padding: 12px 16px; gap: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; }
        .fs-news-thumb { width: 80px; height: 60px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
        .fs-news-title { font-size: 0.85rem; font-weight: 700; line-height: 1.3; }
        .fs-comps-section { background: var(--card-bg); border-radius: 12px; overflow: hidden; }
        .fs-section-header { background: var(--secondary-color); padding: 8px 16px; font-size: 0.7rem; font-weight: 800; color: var(--primary-dark); }
        .fs-comp-item { display: flex; align-items: center; padding: 12px 16px; gap: 12px; border-bottom: 1px solid var(--border-color); text-decoration: none; color: inherit; transition: background 0.2s; }
        .fs-comp-item:hover { background: var(--card-hover); }
        .fs-comp-logo { width: 24px; height: 24px; object-fit: contain; }
        .fs-comp-name { font-size: 0.9rem; font-weight: 700; }
        @media (max-width: 900px) { .main-content-row { grid-template-columns: 1fr; } .fs-hero-img { height: 180px; } }
      `}</style>
    </div>
  );
}
