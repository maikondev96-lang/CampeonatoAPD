import React from 'react';
import { Match } from '../types';
import { Trophy, ChevronRight, Loader2, Calendar, Activity, Users, Layout, Table as TableIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import logoApd from '../assets/logo.png';
import { useSeasonContext } from '../components/SeasonContext';
import { useDashboard } from '../hooks/useDashboard';
import { QueryError } from '../components/QueryError';

// COMPONENTE DE LINHA MEMOIZADO (GPU ACCELERATED) - DEFINIDO FORA PARA PERFORMANCE
const MatchRow = React.memo(({ m, slug, year }: { m: Match, slug: string | undefined, year: string | undefined }) => {
  const isFinished = m.status === 'finalizado';
  const isLive = m.status === 'ao_vivo';
  const homeWin = isFinished && (m.home_score || 0) > (m.away_score || 0);
  const awayWin = isFinished && (m.away_score || 0) > (m.home_score || 0);

  return (
    <Link to={`/competitions/${slug}/${year}/jogos/${m.id}`} className="fs-match-row" style={{ willChange: 'transform' }}>
      <div className="fs-match-time">
        {isFinished ? (
          <span className="fs-status finished">Fim</span>
        ) : isLive ? (
          <span className="fs-status live">Ao Vivo</span>
        ) : (
          <span className="fs-time">{m.time?.slice(0, 5) || 'A Def.'}</span>
        )}
        {!isFinished && !isLive && <span className="fs-date">{m.date?.split('-').reverse().slice(0, 2).join('/')}</span>}
      </div>

      <div className="fs-match-teams">
        <div className="fs-team">
          <img src={m.home_team?.logo_url || logoApd} alt="" className="fs-team-logo" loading="lazy" width="20" height="20" />
          <span className={`fs-team-name ${homeWin ? 'winner' : ''}`}>{m.home_team?.name || 'A Definir'}</span>
          <span className={`fs-team-score ${homeWin ? 'winner' : ''}`}>{isFinished || isLive ? m.home_score : '-'}</span>
        </div>
        <div className="fs-team mt-1">
          <img src={m.away_team?.logo_url || logoApd} alt="" className="fs-team-logo" loading="lazy" width="20" height="20" />
          <span className={`fs-team-name ${awayWin ? 'winner' : ''}`}>{m.away_team?.name || 'A Definir'}</span>
          <span className={`fs-team-score ${awayWin ? 'winner' : ''}`}>{isFinished || isLive ? m.away_score : '-'}</span>
        </div>
      </div>
    </Link>
  );
});

const TournamentDashboard = () => {
  const { slug, year } = useParams<{ slug: string; year: string }>();
  const { season, competition, loading: ctxLoading } = useSeasonContext();

  // Uma única requisição para TUDO (Stats, Jogos, Resultados, Tabela)
  const { data, isLoading, isError, refetch } = useDashboard(season?.id);

  if ((ctxLoading || isLoading) && !data) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
    </div>;
  }

  if (isError && !data) {
    return <QueryError message="Erro ao carregar o campeonato." onRetry={refetch} />;
  }

  if (!season || !data) return null;

  const { stats, nextMatches, recentResults, standings } = data;

  return (
    <div className="page-fluid animate-fade">
      {isError && data && (
        <QueryError message="Conexão instável. Exibindo dados antigos." onRetry={refetch} variant="warning" />
      )}
      <div className="bento-dashboard-grid">
        
        {/* COLUNA 1: PORTAL DE ENTRADA (LADO ESQUERDO) */}
        <div className="bento-col-portal">
          <div className="portal-hero-card" style={{ 
            backgroundImage: competition?.settings_json?.banner_url ? `linear-gradient(rgba(255,255,255,0.9), rgba(255,255,255,0.95)), url(${competition.settings_json.banner_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}>
            <img src={competition?.settings_json?.logo_url || competition?.logo_url || logoApd} alt="" className="portal-logo" />
            <h1 className="portal-title">{competition?.name || 'COPA DO MUNDO APD'}</h1>
            <p className="portal-description">
              {competition?.settings_json?.description || 'A emoção do futebol amador em um torneio de nível mundial.'}
            </p>

            <div className="portal-stats-bar">
              <div className="p-stat">
                <span className="p-val">{stats?.teams || 0}</span>
                <span className="p-lbl">TIMES</span>
              </div>
              <div className="p-stat">
                <span className="p-val">{stats?.players || 0}</span>
                <span className="p-lbl">ATLETAS</span>
              </div>
              <div className="p-stat">
                <span className="p-val">{stats?.matches || 0}</span>
                <span className="p-lbl">JOGOS</span>
              </div>
            </div>

            <div className="portal-menu">
              <Link to={`/competitions/${slug}/${year}/jogos`} className="portal-menu-item">
                <div className="item-icon yellow"><Calendar size={18}/></div>
                <div className="item-text"><h4>Jogos</h4><p>Rodadas e mata-mata.</p></div>
              </Link>
              <Link to={`/competitions/${slug}/${year}/classificacao`} className="portal-menu-item">
                <div className="item-icon green"><TableIcon size={18}/></div>
                <div className="item-text"><h4>Tabela</h4><p>Classificação geral.</p></div>
              </Link>
              <Link to={`/competitions/${slug}/${year}/elencos`} className="portal-menu-item">
                <div className="item-icon yellow"><Users size={18}/></div>
                <div className="item-text"><h4>Elencos</h4><p>Times e jogadores.</p></div>
              </Link>
              <Link to={`/competitions/${slug}/${year}/estatisticas`} className="portal-menu-item">
                <div className="item-icon blue"><Activity size={18}/></div>
                <div className="item-text"><h4>Artilharia</h4><p>Gols e assistências.</p></div>
              </Link>
            </div>
          </div>
        </div>

        {/* COLUNA 2: JOGOS (CENTRO) */}
        <div className="bento-col-center">
          <div className="fs-comps-section">
            <div className="fs-section-header">PRÓXIMOS CONFRONTOS</div>
            <div className="fs-matches-list">
               {nextMatches && nextMatches.length > 0 ? (
                 nextMatches.map((m: Match) => <MatchRow key={m.id} m={m} slug={slug} year={year} />)
               ) : ( <p className="empty-state">Nenhum jogo agendado.</p> )}
            </div>
          </div>

          <div className="fs-comps-section">
            <div className="fs-section-header">ÚLTIMAS PARTIDAS</div>
            <div className="fs-matches-list">
               {recentResults && recentResults.length > 0 ? (
                 recentResults.map((m: Match) => <MatchRow key={m.id} m={m} slug={slug} year={year} />)
               ) : ( <p className="empty-state">Aguardando início.</p> )}
            </div>
          </div>
        </div>

        {/* COLUNA 3: TABELA E STATS (DIREITA) */}
        <div className="bento-col-right">
          <div className="fs-comps-section">
            <div className="fs-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span>G-4 CLASSIFICAÇÃO</span>
               <Link to={`/competitions/${slug}/${year}/classificacao`} style={{ color: 'var(--primary-color)', fontSize: '0.65rem' }}>VER TUDO</Link>
            </div>
            <div className="fs-standings-mini">
              {standings && standings.map((s: any, idx: number) => (
                <div key={s.team_id} className="fs-match-row">
                  <div className={`fs-pos ${idx < 4 ? 'qualified' : ''}`}>{idx + 1}.</div>
                  <div className="fs-team" style={{ flex: 1, paddingLeft: '8px' }}>
                    <img src={s.team?.logo_url || logoApd} alt="" className="fs-team-logo" loading="lazy" />
                    <span className="fs-team-name">{s.team?.name}</span>
                  </div>
                  <div className="fs-team-score winner">{s.points}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .bento-dashboard-grid {
          display: grid;
          grid-template-columns: 320px 1fr 300px;
          gap: 20px;
          align-items: start;
        }

        .bento-col-portal { position: sticky; top: 84px; }
        .portal-hero-card {
          background: var(--card-bg);
          border-radius: 24px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 1px solid var(--border-color);
          box-shadow: 0 10px 30px rgba(0,0,0,0.03);
        }
        .portal-logo { width: 80px; height: 80px; object-fit: contain; margin-bottom: 1.5rem; }
        .portal-title { font-size: 1.25rem; font-weight: 950; color: var(--text-main); margin: 0 0 0.5rem; letter-spacing: -0.5px; line-height: 1.2; }
        .portal-description { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin: 0 0 1.5rem; }
        
        .portal-stats-bar {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%;
          margin-bottom: 2rem; padding: 1rem; background: var(--surface-alt); border-radius: 16px;
        }
        .p-stat { display: flex; flex-direction: column; gap: 2px; }
        .p-val { font-size: 1.1rem; font-weight: 950; color: var(--primary-color); }
        .p-lbl { font-size: 0.6rem; font-weight: 800; color: var(--text-muted); letter-spacing: 1px; }

        .portal-menu { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
        .portal-menu-item {
          display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
          background: var(--surface-alt); border-radius: 16px; text-decoration: none;
          transition: all 0.2s ease; border: 1px solid transparent;
        }
        .portal-menu-item:hover { transform: translateY(-2px); background: var(--card-bg); border-color: var(--primary-color); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        .item-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--card-bg); }
        .item-icon.yellow { color: #eab308; }
        .item-icon.green { color: #22c55e; }
        .item-icon.blue { color: #3b82f6; }
        .item-text h4 { font-size: 0.95rem; font-weight: 900; color: var(--text-main); margin: 0; }
        .item-text p { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }

        @media (max-width: 1200px) {
          .bento-dashboard-grid { grid-template-columns: 1fr; gap: 20px; }
          .bento-col-portal { position: relative; top: 0; }
        }
      `}</style>
    </div>
  );
};

export default TournamentDashboard;
