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
  const [latestResults, setLatestResults] = useState<Match[]>([]);
  const [latestRoundLabel, setLatestRoundLabel] = useState<string>('');
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
        // Mostra todos os jogos daquela rodada que ainda estão agendados
        const roundMatches = sortedMatches.filter(m => 
          m.phase === firstPending.phase && 
          m.round === firstPending.round && 
          m.status === 'agendado'
        );
        setActiveRoundMatches(roundMatches);
      } else {
        setActiveRoundMatches([]);
      }

      const finished = [...matches].filter(m => m.status === 'finalizado').sort((a, b) => {
        // Para último resultado, queremos o mais recente (oposto da ordem acima)
        if (phaseOrder[b.phase] !== phaseOrder[a.phase]) return phaseOrder[b.phase] - phaseOrder[a.phase];
        if (b.phase === 'grupo' && b.round !== a.round) return (b.round || 0) - (a.round || 0);
        
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        
        const timeA = a.time || '';
        const timeB = b.time || '';
        return timeB.localeCompare(timeA);
      });

      if (finished.length > 0) {
        const last = finished[0];
        const roundResults = finished.filter(m => m.phase === last.phase && m.round === last.round);
        setLatestResults(roundResults);
        setLatestRoundLabel(last.phase === 'grupo' ? `Rodada ${last.round}` : last.phase.replace('_', ' '));
      } else {
        setLatestResults([]);
        setLatestRoundLabel('');
      }

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

    // 2. Classificação Automática (Baseada nos jogos buscados acima)
    if (matches) {
      const { data: teams } = await supabase.from('teams').select('*');
      if (teams) {
        const baseMap: Record<string, Standing> = {};
        teams.forEach(t => {
          baseMap[t.id] = { team_id: t.id, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0, team: t } as any;
        });

        const finished = matches.filter(m => m.status === 'finalizado' && m.phase === 'grupo');
        finished.forEach(m => {
          const home = baseMap[m.home_team_id];
          const away = baseMap[m.away_team_id];
          if (!home || !away) return;
          home.played++; away.played++;
          home.goals_for += m.home_score || 0; home.goals_against += m.away_score || 0;
          away.goals_for += m.away_score || 0; away.goals_against += m.home_score || 0;
          if (m.home_score === m.away_score) {
            home.draws++; away.draws++; home.points += 1; away.points += 1;
          } else if ((m.home_score ?? 0) > (m.away_score ?? 0)) {
            home.wins++; away.losses++; home.points += 3;
          } else {
            away.wins++; home.losses++; away.points += 3;
          }
          home.goal_diff = home.goals_for - home.goals_against;
          away.goal_diff = away.goals_for - away.goals_against;
        });

        const sorted = Object.values(baseMap).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
          return b.goals_for - a.goals_for;
        });
        setTopTeams(sorted);
      }
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
        
        {/* ── COLUNA 1: Branding e Atalhos ── */}
        <section className="hero-branding">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <img src={logoApd} alt="APD Logo" className="hero-logo-large" />
            <h1 className="hero-main-title">Copa do Mundo APD</h1>
            <p className="hero-desc">
              A emoção do futebol amador em um torneio de nível mundial.
            </p>
          </div>

          <div className="quick-nav-grid">
            <Link to="/jogos" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(255, 214, 0, 0.1)' }}>
                <Calendar size={20} color="#b89112" />
              </div>
              <h4>Jogos</h4>
              <p>Rodadas, mata-mata e placares.</p>
            </Link>

            <Link to="/classificacao" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(0, 230, 118, 0.1)' }}>
                <Table size={20} color="#00e676" />
              </div>
              <h4>Tabela</h4>
              <p>Classificação e critérios.</p>
            </Link>

            <Link to="/artilharia" className="quick-card">
              <div className="quick-card-icon" style={{ background: 'rgba(10, 25, 47, 0.05)' }}>
                <Activity size={20} color="var(--primary-dark)" />
              </div>
              <h4>Estatísticas</h4>
              <p>Artilharia e desempenho.</p>
            </Link>
          </div>
        </section>

        {/* ── COLUNA 2: Central de Partidas ── */}
        <section className="sidebar-cards">
          
          {/* Status do Torneio / Próximo Jogo */}
          <div className="premium-card">
            <div className="premium-card-header">
              <div className="header-small-label">Calendário</div>
              <h2 className="header-main-title">
                {champion ? 'Fim de Jogo' : activeRoundMatches.length > 0 ? 'Próximos Confrontos' : 'Próxima Fase'}
              </h2>
            </div>
            <div className="premium-card-body" style={{ padding: '0.5rem' }}>
               {champion ? (
                 <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <img src={logoApd} style={{ height: 100, width: 'auto', marginBottom: '1.5rem' }} alt="" />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <img src={champion.logo} style={{ width: 80, height: 80, objectFit: 'contain' }} />
                      <div style={{ fontWeight: 950, fontSize: '1.5rem', color: 'var(--primary-dark)' }}>{champion.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '2px' }}>🏆 Campeão APD 2026 🏆</div>
                    </div>
                 </div>
               ) : activeRoundMatches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px', padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    {activeRoundMatches[0].phase === 'grupo' ? `Rodada ${activeRoundMatches[0].round}` : activeRoundMatches[0].phase.replace('_', ' ')}
                  </div>
                  {activeRoundMatches.map(m => (
                    <Link to={`/jogos/${m.id}`} key={m.id} className="sidebar-match-item" style={{ display: 'block', padding: '1rem', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: m.status === 'adiado' ? 'var(--error)' : 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem', opacity: m.status === 'adiado' ? 1 : 0.6 }}>
                        {m.status === 'adiado' ? '⚠️ ADIADO' : m.date ? m.date.split('-').reverse().join('/') : 'Data a definir'} {m.time ? `• ${m.time.slice(0, 5)}` : '• Horário a definir'}
                      </div>
                      <div className="sidebar-match-info" style={{ padding: 0 }}>
                        <div className="sidebar-team">
                          <img src={m.home_team?.logo_url || logoApd} style={{ width: 32, height: 32 }} alt="" />
                          <span className="team-name-premium" style={{ fontWeight: 800, fontSize: '0.8rem' }}>{m.home_team?.name.slice(0, 3)}</span>
                        </div>
                        <div className="sidebar-vs">VS</div>
                        <div className="sidebar-team">
                          <img src={m.away_team?.logo_url || logoApd} style={{ width: 32, height: 32 }} alt="" />
                          <span className="team-name-premium" style={{ fontWeight: 800, fontSize: '0.8rem' }}>{m.away_team?.name.slice(0, 3)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
               ) : (
                 <div className="empty-msg">Nenhum jogo agendado.</div>
               )}
            </div>
          </div>

          {/* Últimos Resultados */}
          {latestResults.length > 0 && !champion && (
            <div className="premium-card">
              <div className="premium-card-header">
                <div className="header-small-label">Resultados</div>
                <h2 className="header-main-title">{latestRoundLabel}</h2>
              </div>
              <div className="premium-card-body" style={{ padding: '0' }}>
                {latestResults.map(m => (
                  <Link to={`/jogos/${m.id}`} key={m.id} style={{ display: 'block', padding: '1rem', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    <div className="sidebar-match-info" style={{ padding: 0 }}>
                      <div className="sidebar-team" style={{ flexDirection: 'row', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <span className={`team-name-premium ${ (m.home_score || 0) > (m.away_score || 0) ? 'is-winner' : (m.home_score || 0) < (m.away_score || 0) ? 'is-loser' : '' }`} style={{ fontWeight: 800, fontSize: '0.8rem' }}>{m.home_team?.name.slice(0, 3)}</span>
                        <img src={m.home_team?.logo_url} style={{ width: 28, height: 28 }} alt="" />
                      </div>
                      <div className="score-display-premium" style={{ minWidth: '50px', padding: 0, gap: '0.4rem' }}>
                        <div className={`score-number-premium ${(m.home_score || 0) >= (m.away_score || 0) ? 'is-winner' : ''}`} style={{ fontSize: '1.2rem' }}>{m.home_score}</div>
                        <span className="score-divider-premium" style={{ fontSize: '0.8rem', opacity: 0.1 }}>-</span>
                        <div className={`score-number-premium ${(m.away_score || 0) >= (m.home_score || 0) ? 'is-winner' : ''}`} style={{ fontSize: '1.2rem' }}>{m.away_score}</div>
                      </div>
                      <div className="sidebar-team" style={{ flexDirection: 'row', gap: '0.75rem', justifyContent: 'flex-start' }}>
                        <img src={m.away_team?.logo_url} style={{ width: 28, height: 28 }} alt="" />
                        <span className={`team-name-premium ${ (m.away_score || 0) > (m.home_score || 0) ? 'is-winner' : (m.away_score || 0) < (m.home_score || 0) ? 'is-loser' : '' }`} style={{ fontWeight: 800, fontSize: '0.8rem' }}>{m.away_team?.name.slice(0, 3)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── COLUNA 3: Sidebar de Destaques ── */}
        <aside className="sticky-sidebar">
          
          {/* G-4 Mini Tabela */}
          <div className="premium-card" style={{ padding: '0' }}>
            <div className="premium-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="header-small-label">G-4 Zona de Classificação</div>
              <Link to="/classificacao" style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary-color)', textTransform: 'uppercase' }}>Ver Tudo</Link>
            </div>
            <div className="premium-card-body" style={{ padding: '0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 900, color: 'var(--text-muted)', width: '40px' }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 900, color: 'var(--text-muted)' }}>Equipe</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 900, color: 'var(--text-muted)', width: '50px' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {topTeams.slice(0, 4).map((t, idx) => (
                    <tr key={t.team_id} style={{ borderBottom: idx < 3 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 900, color: idx === 0 ? 'var(--primary-color)' : 'var(--text-main)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '4px', height: '12px', background: 'var(--primary-color)', borderRadius: '2px' }} />
                          {idx + 1}º
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img src={t.team?.logo_url} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" />
                          <span style={{ fontWeight: 800 }}>{t.team?.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 900, color: 'var(--primary-dark)' }}>{t.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Artilheiro */}
          {topScorer && (
            <div className="metric-card">
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Artilheiro do Torneio</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>⚽</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary-dark)' }}>{topScorer.name}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{topScorer.value} gols • {topScorer.team_name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Garçom */}
          {topAssist && (
            <div className="metric-card">
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Líder de Assistências</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>👟</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary-dark)' }}>{topAssist.name}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{topAssist.value} passes • {topAssist.team_name}</div>
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
