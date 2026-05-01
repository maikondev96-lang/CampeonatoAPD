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
  const { season, competition, loading: ctxLoading, selectCompetition } = useSeasonContext();
  const [nextMatches, setNextMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Match[]>([]);
  const [topStandings, setTopStandings] = useState<Standing[]>([]);
  const [topScorer, setTopScorer] = useState<HeroStat | null>(null);
  const [topAssist, setTopAssist] = useState<HeroStat | null>(null);
  const [currentRound, setCurrentRound] = useState<string | null>(null);
  const [seasonStats, setSeasonStats] = useState({ teams: 0, players: 0, matches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug && year) {
      selectCompetition(slug, parseInt(year));
    }
  }, [slug, year, selectCompetition]);

  useEffect(() => {
    if (season?.id) fetchData();
  }, [season?.id]);

  const fetchData = async () => {
    if (!season) return;
    setLoading(true);
    try {
      const [
        { count: teamsCount },
        { count: matchesCount },
        firstNext,
        recentRes,
        teamsRes,
        stagesRes
      ] = await Promise.all([
        supabase.from('season_teams').select('*', { count: 'exact', head: true }).eq('season_id', season.id),
        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', season.id),
        supabase.from('matches').select('round, stage_id, stage:stages(name, type)').eq('season_id', season.id).eq('status', 'agendado').order('date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('matches').select('*, home_team:teams!home_team_id(name, logo_url, short_name), away_team:teams!away_team_id(name, logo_url, short_name)').eq('season_id', season.id).eq('status', 'finalizado').order('date', { ascending: false }).limit(4),
        supabase.from('season_teams').select('team:teams(*)').eq('season_id', season.id),
        supabase.from('stages').select('id').eq('season_id', season.id).eq('type', 'group')
      ]);

      let nextMatchesData: Match[] = [];
      if (firstNext.data) {
        const query = supabase.from('matches').select('*, home_team:teams!home_team_id(name, logo_url, short_name), away_team:teams!away_team_id(name, logo_url, short_name)').eq('season_id', season.id).eq('status', 'agendado');
        if (firstNext.data.round) { query.eq('round', firstNext.data.round); setCurrentRound(`RODADA ${firstNext.data.round}`); }
        else { query.eq('stage_id', firstNext.data.stage_id); setCurrentRound((firstNext.data as any).stage?.name?.toUpperCase() || 'PRÓXIMA FASE'); }
        const { data } = await query.order('date', { ascending: true }).order('time', { ascending: true }).limit(6);
        nextMatchesData = data || [];
      }

      const teamIds = (teamsRes.data || []).map((st: any) => st.team?.id).filter(Boolean);
      const groupStageIds = (stagesRes.data || []).map(s => s.id);

      const [{ count: playersCount }, { data: events }, { data: allGroupMatches }, { data: players }] = await Promise.all([
        supabase.from('players').select('*', { count: 'exact', head: true }).in('team_id', teamIds),
        supabase.from('match_events').select('player_id, assist_player_id, type, match:matches!inner(season_id)').eq('match.season_id', season.id),
        supabase.from('matches').select('*').eq('season_id', season.id).eq('status', 'finalizado').in('stage_id', groupStageIds),
        supabase.from('players').select('*, team:teams(name, logo_url)').in('team_id', teamIds)
      ]);

      setSeasonStats({
        teams: teamsCount || 0,
        players: playersCount || 0,
        matches: matchesCount || 0
      });

      if (teamsRes.data && allGroupMatches) {
        // ... (resto da lógica de classificação)
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
    const isLive = m.status === 'ao_vivo';
    const homeWin = isFinished && (m.home_score || 0) > (m.away_score || 0);
    const awayWin = isFinished && (m.away_score || 0) > (m.home_score || 0);

    return (
      <Link key={m.id} to={`/competitions/${slug}/${year}/jogos/${m.id}`} className="fs-match-row">
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
            {m.home_team?.logo_url ? (
              <img src={m.home_team.logo_url} alt="" className="fs-team-logo" />
            ) : (
              <div className="fs-team-logo-placeholder">?</div>
            )}
            <span className={`fs-team-name ${!m.home_team ? 'placeholder' : ''} ${homeWin ? 'winner' : ''}`}>{m.home_team?.name || 'A Definir'}</span>
            <span className={`fs-team-score ${homeWin ? 'winner' : ''}`}>{isFinished || isLive ? m.home_score : '-'}</span>
          </div>
          <div className="fs-team mt-1">
            {m.away_team?.logo_url ? (
              <img src={m.away_team.logo_url} alt="" className="fs-team-logo" />
            ) : (
              <div className="fs-team-logo-placeholder">?</div>
            )}
            <span className={`fs-team-name ${!m.away_team ? 'placeholder' : ''} ${awayWin ? 'winner' : ''}`}>{m.away_team?.name || 'A Definir'}</span>
            <span className={`fs-team-score ${awayWin ? 'winner' : ''}`}>{isFinished || isLive ? m.away_score : '-'}</span>
          </div>
        </div>
      </Link>
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

            {/* STATS MINI BAR */}
            <div className="portal-stats-bar">
              <div className="p-stat">
                <span className="p-val">{seasonStats.teams}</span>
                <span className="p-lbl">TIMES</span>
              </div>
              <div className="p-stat">
                <span className="p-val">{seasonStats.players}</span>
                <span className="p-lbl">ATLETAS</span>
              </div>
              <div className="p-stat">
                <span className="p-val">{seasonStats.matches}</span>
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
              <Link to={`/competitions/${slug}/${year}/artilharia`} className="portal-menu-item">
                <div className="item-icon blue"><Activity size={18}/></div>
                <div className="item-text"><h4>Estatísticas</h4><p>Artilharia e desempenho.</p></div>
              </Link>
            </div>
          </div>
        </div>

        {/* COLUNA 2: CALENDÁRIO E RESULTADOS (CENTRAL) */}
        <div className="bento-col-center">
          <div className="fs-comps-section">
            <div className="fs-section-header">PRÓXIMOS CONFRONTOS</div>
            <div className="fs-matches-list">
               {nextMatches.length > 0 ? (
                 <>
                   {currentRound && <div className="fs-round-header"><span>{currentRound}</span></div>}
                   {nextMatches.map(renderMatchRow)}
                 </>
               ) : ( <p className="empty-state">Nenhum jogo agendado.</p> )}
            </div>
          </div>

          <div className="fs-comps-section">
            <div className="fs-section-header">ÚLTIMAS PARTIDAS</div>
            <div className="fs-matches-list">
               {recentResults.length > 0 ? (
                 recentResults.map(renderMatchRow)
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
              {topStandings.map((s, idx) => (
                <div key={s.team_id} className="fs-match-row">
                  <div className={`fs-pos ${idx < 4 ? 'qualified' : ''}`}>{idx + 1}.</div>
                  <div className="fs-team" style={{ flex: 1, paddingLeft: '8px' }}>
                    <img src={s.team?.logo_url} alt="" className="fs-team-logo" />
                    <span className="fs-team-name">{s.team?.name}</span>
                  </div>
                  <div className="fs-team-score winner">{s.points}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fs-comps-section">
            <div className="fs-section-header">DESTAQUES</div>
            {topScorer && (
              <div className="fs-match-row" style={{ padding: '12px' }}>
                 <img src={topScorer.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${topScorer.name}`} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover', marginRight: 12 }} />
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{topScorer.name}</span>
                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{topScorer.team_name}</span>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-dark)' }}>{topScorer.value}</span>
                   <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Gols</span>
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
        .portal-description { font-size: 0.85rem; color: var(--text-muted); margin: 0.75rem 0 1.5rem; line-height: 1.4; }
        
        .portal-stats-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          width: 100%;
          margin-bottom: 2rem;
          padding: 1rem;
          background: var(--surface-alt);
          border-radius: 16px;
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
        .item-text { text-align: left; }
        .item-text h4 { font-size: 0.95rem; font-weight: 900; color: var(--text-main); margin: 0; }
        .item-text p { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0 0; }



        @media (max-width: 1200px) {
          .bento-dashboard-grid { grid-template-columns: 1fr; gap: 0; }
          .bento-col-portal { position: relative; top: 0; }
          .portal-hero-card { border-radius: 0; border-left: none; border-right: none; }
        }
      `}</style>
    </div>
  );
};

export default TournamentDashboard;
