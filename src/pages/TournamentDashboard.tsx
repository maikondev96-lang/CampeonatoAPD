import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Match, Standing } from '../types';
import { Trophy, ChevronRight, Loader2, Calendar, Target, Activity, Users, Star, Layout, Table as TableIcon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import logoApd from '../assets/logo.png';
import { useSeasonContext } from '../components/SeasonContext';

interface HeroStat {
  name: string;
  team_name: string;
  team_logo: string;
  photo_url?: string;
  value: number;
}

const TournamentDashboard = () => {
  const { slug, year } = useParams<{ slug: string; year: string }>();
  const navigate = useNavigate();
  const { season, competition, loading: ctxLoading } = useSeasonContext();
  const [nextMatches, setNextMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Match[]>([]);
  const [topStandings, setTopStandings] = useState<Standing[]>([]);
  const [topScorer, setTopScorer] = useState<HeroStat | null>(null);
  const [topAssist, setTopAssist] = useState<HeroStat | null>(null);
  const [currentRound, setCurrentRound] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (season?.id) fetchData();
  }, [season?.id]);

  const fetchData = async () => {
    if (!season) return;
    setLoading(true);
    try {
      const { data: firstNext } = await supabase.from('matches').select('round, stage_id, stage:stages(name, type)').eq('season_id', season.id).eq('status', 'agendado').order('date', { ascending: true }).limit(1).single();
      let nextMatchesData: Match[] = [];
      if (firstNext) {
        const query = supabase.from('matches').select('*, home_team:teams!home_team_id(name, logo_url, short_name), away_team:teams!away_team_id(name, logo_url, short_name)').eq('season_id', season.id).eq('status', 'agendado');
        if (firstNext.round) { query.eq('round', firstNext.round); setCurrentRound(`RODADA ${firstNext.round}`); }
        else { query.eq('stage_id', firstNext.stage_id); setCurrentRound((firstNext as any).stage?.name?.toUpperCase() || 'PRÓXIMA FASE'); }
        const { data } = await query.order('date', { ascending: true }).order('time', { ascending: true }).limit(6);
        nextMatchesData = data || [];
      }
      const [recentRes, teamsRes, stagesRes] = await Promise.all([
        supabase.from('matches').select('*, home_team:teams!home_team_id(name, logo_url, short_name), away_team:teams!away_team_id(name, logo_url, short_name)').eq('season_id', season.id).eq('status', 'finalizado').order('date', { ascending: false }).limit(4),
        supabase.from('season_teams').select('team:teams(*)').eq('season_id', season.id),
        supabase.from('stages').select('id').eq('season_id', season.id).eq('type', 'group')
      ]);
      const teamIds = (teamsRes.data || []).map((st: any) => st.team?.id).filter(Boolean);
      const groupStageIds = (stagesRes.data || []).map(s => s.id);
      const [{ data: players }, { data: events }, { data: allGroupMatches }] = await Promise.all([
        supabase.from('players').select('id, name, team_id, photo_url, team:teams(name, logo_url)').in('team_id', teamIds),
        supabase.from('match_events').select('player_id, assist_player_id, type, match:matches!inner(season_id)').eq('match.season_id', season.id),
        supabase.from('matches').select('*').eq('season_id', season.id).eq('status', 'finalizado').in('stage_id', groupStageIds)
      ]);
      if (teamsRes.data && allGroupMatches) {
        const baseMap: Record<string, Standing> = {};
        teamsRes.data.forEach((st: any) => { const t = st.team; baseMap[t.id] = { team_id: t.id, season_id: season.id, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0, team: t }; });
        allGroupMatches.forEach(m => { const h = baseMap[m.home_team_id]; const a = baseMap[m.away_team_id]; if (!h || !a) return; h.played++; a.played++; h.goals_for += m.home_score || 0; h.goals_against += m.away_score || 0; a.goals_for += m.away_score || 0; a.goals_against += m.home_score || 0; if (m.home_score === m.away_score) { h.points += 1; a.points += 1; } else if ((m.home_score || 0) > (m.away_score || 0)) { h.points += 3; } else { a.points += 3; } });
        const sorted = Object.values(baseMap).sort((a, b) => b.points - a.points || (b.goals_for - b.goals_against) - (a.goals_for - a.goals_against)).slice(0, 4);
        setTopStandings(sorted);
      }
      if (players && events) {
        const gMap: Record<string, number> = {}; const aMap: Record<string, number> = {};
        events.forEach(e => { if (e.type === 'gol' && e.player_id) gMap[e.player_id] = (gMap[e.player_id] || 0) + 1; if (e.type === 'gol' && e.assist_player_id) aMap[e.assist_player_id] = (aMap[e.assist_player_id] || 0) + 1; });
        const getTop = (map: Record<string, number>) => { const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0]; if (!top) return null; const p = players.find(pl => pl.id === top[0]); return p ? { name: p.name, team_name: (p.team as any).name, team_logo: (p.team as any).logo_url, photo_url: p.photo_url, value: top[1] } : null; };
        setTopScorer(getTop(gMap)); setTopAssist(getTop(aMap));
      }
      setNextMatches(nextMatchesData);
      setRecentResults(recentRes.data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const renderMatchRow = (m: Match) => {
    const isFinished = m.status === 'finalizado';
    return (
      <div key={m.id} className="premium-match-row" onClick={() => navigate(`/competitions/${slug}/${year}/jogos/${m.id}`)}>
        <div className="match-row-content">
          {/* LADO CASA */}
          <div className="team-container home">
            <span className="team-name-full">{m.home_team?.name}</span>
            <span className="team-name-short">{m.home_team?.short_name || m.home_team?.name?.slice(0,3).toUpperCase()}</span>
            <img src={m.home_team?.logo_url} alt="" className="team-shield" />
          </div>

          {/* PLACAR / INFO */}
          <div className="score-container">
            {isFinished ? (
              <div className="score-box-final">
                <span className={m.home_score! > m.away_score! ? 'is-winner' : ''}>{m.home_score}</span>
                <span className="score-divider">:</span>
                <span className={m.away_score! > m.home_score! ? 'is-winner' : ''}>{m.away_score}</span>
              </div>
            ) : (
              <div className="match-time-info">
                <span className="m-date">{m.date?.split('-').reverse().join('/')}</span>
                <span className="m-hour">{m.time?.slice(0, 5) || 'A DEF.'}</span>
              </div>
            )}
          </div>

          {/* LADO FORA */}
          <div className="team-container away">
            <img src={m.away_team?.logo_url} alt="" className="team-shield" />
            <span className="team-name-full">{m.away_team?.name}</span>
            <span className="team-name-short">{m.away_team?.short_name || m.away_team?.name?.slice(0,3).toUpperCase()}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading || ctxLoading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}><Loader2 className="animate-spin" size={32} color="var(--primary-color)" /></div>;
  }

  return (
    <div className="page-fluid animate-fade">
      <div className="bento-dashboard-grid">
        
        {/* COLUNA 1: PORTAL DE ENTRADA (LADO ESQUERDO) */}
        <div className="bento-col-portal">
          <div className="portal-hero-card">
            <img src={competition?.logo_url || logoApd} alt="" className="portal-logo" />
            <h1 className="portal-title">{competition?.name || 'COPA DO MUNDO APD'}</h1>
            <p className="portal-description">A emoção do futebol amador em um torneio de nível mundial.</p>

            <div className="portal-menu">
              <Link to={`/competitions/${slug}/${year}/jogos`} className="portal-menu-item">
                <div className="item-icon yellow"><Calendar size={18}/></div>
                <div className="item-text"><h4>Jogos</h4><p>Rodadas e mata-mata.</p></div>
              </Link>
              <Link to={`/competitions/${slug}/${year}/classificacao`} className="portal-menu-item">
                <div className="item-icon green"><TableIcon size={18}/></div>
                <div className="item-text"><h4>Tabela</h4><p>Classificação geral.</p></div>
              </Link>
              <Link to={`/competitions/${slug}/${year}/estatisticas`} className="portal-menu-item">
                <div className="item-icon blue"><Activity size={18}/></div>
                <div className="item-text"><h4>Estatísticas</h4><p>Artilharia e desempenho.</p></div>
              </Link>
            </div>
          </div>
        </div>

        {/* COLUNA 2: CALENDÁRIO E RESULTADOS (CENTRAL) */}
        <div className="bento-col-center">
          <div className="premium-card bento-card">
            <div className="premium-card-header">
               <div className="section-label-bar"><span className="header-small-label">PRÓXIMOS CONFRONTOS</span></div>
            </div>
            <div className="card-body-full">
               {nextMatches.length > 0 ? (
                 <>
                   {currentRound && <div className="round-separator"><span>{currentRound}</span></div>}
                   <div className="matches-vertical-list">{nextMatches.map(renderMatchRow)}</div>
                 </>
               ) : ( <p className="empty-text">Nenhum jogo agendado.</p> )}
            </div>
          </div>

          <div className="premium-card bento-card">
            <div className="premium-card-header">
               <div className="section-label-bar"><span className="header-small-label">ÚLTIMAS PARTIDAS</span></div>
            </div>
            <div className="card-body-full">
               {recentResults.length > 0 ? (
                 <div className="matches-vertical-list">{recentResults.map(renderMatchRow)}</div>
               ) : ( <p className="empty-text">Aguardando início.</p> )}
            </div>
          </div>
        </div>

        {/* COLUNA 3: TABELA E STATS (DIREITA) */}
        <div className="bento-col-right">
          <div className="premium-card bento-card">
            <div className="premium-card-header">
               <div className="section-label-bar"><span className="header-small-label">G-4 CLASSIFICAÇÃO</span></div>
               <Link to={`/competitions/${slug}/${year}/classificacao`} className="view-all-link">VER TUDO</Link>
            </div>
            <div className="card-body-full">
                <div className="standings-g4-list">
                  {topStandings.map((s, idx) => (
                    <div key={s.team_id} className={`standings-g4-item ${idx < 4 ? 'is-advancing' : ''}`}>
                      <div className="g4-pos">{idx + 1}º</div>
                      <div className="g4-team">
                        <img src={s.team?.logo_url} alt="" />
                        <span>{s.team?.name}</span>
                      </div>
                      <div className="g4-pts">{s.points}<span>PTS</span></div>
                    </div>
                  ))}
                </div>
            </div>
          </div>

          <div className="stats-mini-group">
            {topScorer && (
              <div className="premium-card highlight-card scorer bento-card">
                <div className="premium-card-header"><span className="header-small-label">ARTILHEIRO</span></div>
                <div className="stats-body">
                   <img src={topScorer.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topScorer.name}`} alt="" />
                   <div><h4>{topScorer.name}</h4><p><span>{topScorer.value} gols</span> • {topScorer.team_name}</p></div>
                </div>
              </div>
            )}

            {topAssist && (
              <div className="premium-card highlight-card assist bento-card">
                <div className="premium-card-header"><span className="header-small-label">ASSISTÊNCIAS</span></div>
                <div className="stats-body">
                   <img src={topAssist.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topAssist.name}`} alt="" />
                   <div><h4>{topAssist.name}</h4><p><span>{topAssist.value} passes</span> • {topAssist.team_name}</p></div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        .bento-dashboard-grid {
          display: grid;
          grid-template-columns: 420px 1fr 380px;
          gap: 1.5rem;
          width: 100%;
          align-items: start;
        }

        .bento-col-portal { position: sticky; top: 80px; }
        .bento-col-center { display: flex; flex-direction: column; gap: 1.5rem; }
        .bento-col-right { display: flex; flex-direction: column; gap: 1.5rem; }

        .bento-card { margin-bottom: 0 !important; border-radius: 20px !important; }
        .card-body-full { padding: 0.5rem 0; }

        .portal-hero-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 24px;
          padding: 2.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
        }

        .portal-logo { width: 140px; height: 140px; object-fit: contain; margin-bottom: 1.5rem; }
        .portal-title { font-size: 1.75rem; font-weight: 950; color: var(--text-main); margin: 0; text-transform: uppercase; letter-spacing: -1px; }
        .portal-description { font-size: 0.85rem; color: var(--text-muted); margin: 0.75rem 0 2rem; line-height: 1.4; }

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
        .item-text { text-align: left; }
        .item-text h4 { font-size: 0.95rem; font-weight: 900; color: var(--text-main); margin: 0; }
        .item-text p { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }

        /* NOVA LINHA DE JOGO PREMIUM */
        .premium-match-row {
          padding: 1rem 1.5rem;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        .premium-match-row:hover { background: var(--surface-alt); }
        .premium-match-row:last-child { border-bottom: none; }

        .match-row-content {
          display: grid;
          grid-template-columns: 1fr 100px 1fr;
          align-items: center;
          gap: 1rem;
        }

        .team-container { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .team-container.home { justify-content: flex-end; text-align: right; }
        .team-container.away { justify-content: flex-start; text-align: left; }

        .team-shield { width: 32px; height: 32px; object-fit: contain; flex-shrink: 0; }
        .team-name-full { font-weight: 850; font-size: 1rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .team-name-short { display: none; font-weight: 950; font-size: 0.9rem; color: var(--text-main); }

        .score-container { display: flex; justify-content: center; }
        .score-box-final {
          color: var(--text-main);
          padding: 6px 14px;
          font-weight: 950;
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          gap: 12px;
          letter-spacing: 1px;
        }
        .score-divider { opacity: 0.4; font-size: 0.8rem; }
        .is-winner { color: var(--primary-color); text-shadow: 0 0 8px rgba(var(--primary-rgb), 0.4); }

        .match-time-info {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 4px 10px; background: var(--surface-alt); border-radius: 8px;
        }
        .match-time-info .m-date { font-size: 0.65rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; }
        .match-time-info .m-hour { font-size: 0.8rem; font-weight: 950; color: var(--primary-color); }

        .round-separator { text-align: center; margin: 1rem 0; position: relative; display: flex; align-items: center; justify-content: center; }
        .round-separator::before { content: ''; position: absolute; left: 0; right: 0; height: 1px; background: var(--border-color); }
        .round-separator span { background: var(--card-bg); padding: 0 12px; position: relative; font-size: 0.7rem; font-weight: 950; color: var(--text-muted); letter-spacing: 1.5px; text-transform: uppercase; }

        /* ESTILO G-4 AVANÇANDO */
        .standings-g4-list { display: flex; flex-direction: column; gap: 4px; padding: 0.5rem; }
        .standings-g4-item {
          display: flex; align-items: center; gap: 12px; padding: 0.85rem 1rem;
          background: var(--surface-alt); border-radius: 12px; position: relative;
          transition: all 0.2s ease; border: 1px solid transparent;
        }
        .standings-g4-item.is-advancing {
          background: var(--card-bg); border-left: 4px solid #22c55e;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .g4-pos { font-size: 0.8rem; font-weight: 950; color: var(--text-muted); width: 24px; }
        .is-advancing .g4-pos { color: var(--text-main); }
        .g4-team { flex: 1; display: flex; align-items: center; gap: 10px; }
        .g4-team img { width: 24px; height: 24px; object-fit: contain; }
        .g4-team span { font-size: 0.9rem; font-weight: 850; color: var(--text-main); }
        .g4-pts { text-align: right; font-weight: 950; font-size: 1.1rem; color: var(--primary-color); display: flex; flex-direction: column; line-height: 1; }
        .g4-pts span { font-size: 0.6rem; color: var(--text-subtle); font-weight: 800; }

        .stats-body { padding: 1.25rem; display: flex; align-items: center; gap: 1rem; }
        .stats-body img { width: 50px; height: 50px; border-radius: 12px; object-fit: cover; background: var(--surface-alt); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .stats-body h4 { font-weight: 900; font-size: 1rem; color: var(--text-main); margin: 0; }
        .stats-body p { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }
        .stats-body p span { font-weight: 800; color: var(--text-main); }

        @media (max-width: 1400px) {
          .team-name-full { display: none; }
          .team-name-short { display: block; }
          .match-row-content { grid-template-columns: 1fr 100px 1fr; }
        }

        @media (max-width: 1200px) {
          .bento-dashboard-grid { grid-template-columns: 1fr; }
          .bento-col-portal { position: relative; top: 0; }
          .team-name-full { display: block; }
          .team-name-short { display: none; }
        }
      `}</style>
    </div>
  );
};

export default TournamentDashboard;
