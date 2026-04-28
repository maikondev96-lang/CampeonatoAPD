import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, Standing } from '../types';
import { Trophy, Calendar, Table, ChevronRight, Loader2, Goal, Star, HandHeart, Activity } from 'lucide-react';
import logoApd from '../assets/logo.png';

interface HeroStat {
  name: string;
  team_name: string;
  team_logo: string;
  value: number;
}

const Home = () => {
  const [activeRoundMatches, setActiveRoundMatches] = useState<Match[]>([]);
  const [latestResult, setLatestResult] = useState<Match | null>(null);
  const [topTeams, setTopTeams] = useState<Standing[]>([]);
  const [champion, setChampion] = useState<{ name: string; logo: string } | null>(null);
  const [topScorer, setTopScorer] = useState<HeroStat | null>(null);
  const [topAssist, setTopAssist] = useState<HeroStat | null>(null);
  const [recentResults, setRecentResults] = useState<Record<string, ('W' | 'D' | 'L')[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    // 1. Partidas
    const { data: matches } = await supabase
      .from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .order('date');

    if (matches) {
      // Ordenação inteligente: grupo (por rodada) -> semi -> 3º lugar -> final
      const phaseOrder = { 'grupo': 1, 'semifinal': 2, 'terceiro_lugar': 3, 'final': 4 };
      const sortedMatches = [...matches].sort((a, b) => {
        if (phaseOrder[a.phase] !== phaseOrder[b.phase]) {
          return phaseOrder[a.phase] - phaseOrder[b.phase];
        }
        if (a.phase === 'grupo' && a.round !== b.round) {
          return (a.round || 0) - (b.round || 0);
        }
        // Se mesma fase/rodada, ordena por data e hora
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        
        const timeA = a.time || '99:99';
        const timeB = b.time || '99:99';
        return timeA.localeCompare(timeB);
      });

      const firstPending = sortedMatches.find(m => m.status === 'agendado');
      if (firstPending) {
        const roundMatches = sortedMatches.filter(m => m.phase === firstPending.phase && m.round === firstPending.round);
        setActiveRoundMatches(roundMatches);
      } else {
        setActiveRoundMatches([]);
      }

      const finished = [...matches].filter(m => m.status === 'finalizado').sort((a, b) => {
        // Para último resultado, queremos o mais recente (oposto da ordem acima)
        if (phaseOrder[b.phase] !== phaseOrder[a.phase]) return phaseOrder[b.phase] - phaseOrder[a.phase];
        if (b.phase === 'grupo' && b.round !== a.round) return (b.round || 0) - (a.round || 0);
        return (b.date || '').localeCompare(a.date || '');
      });
      setLatestResult(finished.length > 0 ? finished[0] : null);

      // Campeão: vencedor da final
      const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finalizado' && m.winner_id);
      if (finalMatch) {
        const isHomeWinner = finalMatch.winner_id === finalMatch.home_team_id;
        setChampion({
          name: isHomeWinner ? finalMatch.home_team?.name : finalMatch.away_team?.name,
          logo: isHomeWinner ? finalMatch.home_team?.logo_url : finalMatch.away_team?.logo_url,
        });
      }

      // Últimos jogos por time (grupo apenas, orderáveis por data)
      const groupFinished = finished.filter(m => m.phase === 'grupo');
      const resultsMap: Record<string, ('W' | 'D' | 'L')[]> = {};
      groupFinished.forEach(m => {
        const addResult = (teamId: string, result: 'W' | 'D' | 'L') => {
          if (!resultsMap[teamId]) resultsMap[teamId] = [];
          resultsMap[teamId].push(result);
        };
        if (m.home_score === m.away_score) {
          addResult(m.home_team_id, 'D'); addResult(m.away_team_id, 'D');
        } else if ((m.home_score ?? 0) > (m.away_score ?? 0)) {
          addResult(m.home_team_id, 'W'); addResult(m.away_team_id, 'L');
        } else {
          addResult(m.home_team_id, 'L'); addResult(m.away_team_id, 'W');
        }
      });
      // Guarda somente os últimos 5
      Object.keys(resultsMap).forEach(id => {
        resultsMap[id] = resultsMap[id].slice(-5);
      });
      setRecentResults(resultsMap);
    }

    // 2. Standings
    const { data: standings } = await supabase.from('standings').select('*, team:teams(*)');
    if (standings) {
      const sorted = [...standings].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
        return b.goals_for - a.goals_for;
      }); // Sem slice — mostra todos os times
      setTopTeams(sorted);
    }

    // 3. Artilheiro & Garçom
    const [{ data: players }, { data: events }] = await Promise.all([
      supabase.from('players').select('id, name, team_id, team:teams(name, logo_url)'),
      supabase.from('match_events').select('player_id, assist_player_id, type')
    ]);

    if (players && events) {
      const goalsMap: Record<string, number> = {};
      const assistsMap: Record<string, number> = {};

      events.forEach(ev => {
        if (ev.type === 'gol') goalsMap[ev.player_id] = (goalsMap[ev.player_id] || 0) + 1;
        if (ev.assist_player_id) assistsMap[ev.assist_player_id] = (assistsMap[ev.assist_player_id] || 0) + 1;
      });

      const toStat = (map: Record<string, number>): HeroStat | null => {
        const topId = Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (!topId) return null;
        const p = players.find(pl => pl.id === topId);
        if (!p) return null;
        return { name: p.name, team_name: (p.team as any)?.name || '', team_logo: (p.team as any)?.logo_url || '', value: map[topId] };
      };

      setTopScorer(toStat(goalsMap));
      setTopAssist(toStat(assistsMap));
    }

    setLoading(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-up container">
      <div className="dashboard-grid">
        
        {/* ── COLUNA ESQUERDA: Branding e Atalhos ── */}
        <section className="hero-branding">
          <img src={logoApd} alt="APD Logo" className="hero-logo-large" />
          
          <div className="hero-label">Torneio Mundial Amador</div>
          <h1 className="hero-main-title">
            Copa do Mundo<br />APD
          </h1>
          <p className="hero-desc">
            A emoção do futebol amador em um torneio de nível mundial.
          </p>

          <div className="quick-nav-grid">
            <Link to="/jogos" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(255, 214, 0, 0.1)' }}>
                <Calendar size={20} color="#b89112" />
              </div>
              <h4>Jogos</h4>
              <p>Rodadas, mata-mata, placares e eventos.</p>
            </Link>

            <Link to="/classificacao" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(0, 230, 118, 0.1)' }}>
                <Table size={20} color="#00e676" />
              </div>
              <h4>Classificação</h4>
              <p>Tabela da liga com pontos e critérios.</p>
            </Link>

            <Link to="/artilharia" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(10, 25, 47, 0.05)' }}>
                <Activity size={20} color="var(--primary-dark)" />
              </div>
              <h4>Artilharia</h4>
              <p>Ranking dos goleadores do campeonato.</p>
            </Link>
          </div>
        </section>

        {/* ── COLUNA DIREITA: Sidebar de Destaques ── */}
        <aside className="sidebar-cards">
          
          {/* Status do Torneio / Próximo Jogo */}
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="header-small-label">Copa do Mundo APD</div>
                            <h2 className="header-main-title">
                {champion ? 'Finalizado' : activeRoundMatches.length > 0 ? 'Próxima Rodada' : 'Aguardando a final'}
              </h2>
            </div>
            <div className="premium-card-body">
               {champion ? (
                 <div style={{ textAlign: 'center', padding: '1.5rem 1rem', position: 'relative', overflow: 'hidden' }}>
                    <img src={logoApd} style={{ height: 110, width: 'auto', marginBottom: '1.5rem', filter: 'drop-shadow(0 0 25px rgba(255, 255, 255, 0.2))' }} alt="" />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={champion.logo} style={{ width: 70, height: 70, objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))' }} />
                      <div style={{ fontWeight: 950, fontSize: '1.5rem', color: 'var(--primary-dark)', letterSpacing: '-0.5px', lineHeight: 1 }}>{champion.name}</div>
                    </div>

                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 950, marginTop: '1.5rem', textTransform: 'uppercase', letterSpacing: '3px' }}>🏆 Grande Campeão 🏆</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.6, marginTop: '0.5rem', fontWeight: 800 }}>Mundial APD • 2026</div>
                 </div>
               ) : activeRoundMatches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px', background: '#f8fafc', padding: '6px', borderRadius: '6px' }}>
                    {activeRoundMatches[0].phase === 'grupo' ? `Rodada ${activeRoundMatches[0].round}` : activeRoundMatches[0].phase.replace('_', ' ')}
                  </div>
                  {activeRoundMatches.map(m => (
                    <div key={m.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.5rem', opacity: 0.7 }}>
                        {m.date ? m.date.split('-').reverse().join('/') : 'Data a definir'} {m.time && `• ${m.time.slice(0, 5)}`}
                      </div>
                      <div className="sidebar-match-info" style={{ padding: 0 }}>
                        <div className="sidebar-team">
                          {m.home_team?.logo_url ? (
                            <img src={m.home_team.logo_url} style={{ width: 32, height: 32 }} alt="" />
                          ) : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>?</div>}
                          <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{m.home_team?.name.slice(0, 3) || 'TBD'}</span>
                        </div>
                        <div className="sidebar-vs" style={{ fontSize: '0.6rem' }}>VS</div>
                        <div className="sidebar-team">
                          {m.away_team?.logo_url ? (
                            <img src={m.away_team.logo_url} style={{ width: 32, height: 32 }} alt="" />
                          ) : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 900 }}>?</div>}
                          <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{m.away_team?.name.slice(0, 3) || 'TBD'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               ) : (
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                   Aguardando sorteio das partidas.
                 </p>
               )}
            </div>
          </div>

          {/* Último Resultado */}
          {latestResult && !champion && (
            <div className="premium-card" style={{ border: '1px solid #edf2f7' }}>
              <div className="premium-card-header" style={{ background: '#f8fafc', color: 'var(--primary-dark)', borderBottom: '1px solid #edf2f7' }}>
                <div className="header-small-label">Último Resultado</div>
                <h2 className="header-main-title" style={{ color: 'var(--primary-dark)' }}>{latestResult.phase}</h2>
              </div>
              <div className="premium-card-body">
                <div className="sidebar-match-info">
                  <div className="sidebar-team">
                    <img src={latestResult.home_team?.logo_url} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>{latestResult.home_score}</span>
                      {latestResult.home_penalties != null && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 800 }}>({latestResult.home_penalties})</span>
                      )}
                    </div>
                  </div>
                  <div className="sidebar-vs">X</div>
                  <div className="sidebar-team">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>{latestResult.away_score}</span>
                      {latestResult.away_penalties != null && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 800 }}>({latestResult.away_penalties})</span>
                      )}
                    </div>
                    <img src={latestResult.away_team?.logo_url} />
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  PARTIDA ENCERRADA
                </div>
              </div>
            </div>
          )}

          {/* Líder da Liga */}
          {topTeams[0] && (
            <div className="metric-card">
              <div className="metric-label">Líder da Liga</div>
              <div className="metric-content">
                <div className="metric-val">{topTeams[0].points} pts</div>
                <div className="metric-entity">
                  <div className="entity-name">{topTeams[0].team?.name}</div>
                  <div className="entity-sub">{topTeams[0].team?.name.slice(0, 3)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Artilheiro */}
          {topScorer && (
            <div className="metric-card">
              <div className="metric-label">Artilheiro</div>
              <div className="metric-content">
                <div className="metric-val">{topScorer.value} gols</div>
                <div className="metric-entity">
                  <div className="entity-name">{topScorer.name}</div>
                  <div className="entity-sub">{topScorer.team_name}</div>
                </div>
              </div>
            </div>
          )}

        </aside>

      </div>
    </div>
  );
};

export default Home;
