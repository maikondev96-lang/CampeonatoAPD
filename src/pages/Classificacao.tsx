import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Standing } from '../types';
import { Table, Loader2, Info } from 'lucide-react';
import { useSeasonContext } from '../components/SeasonContext';
import { useQuery } from '@tanstack/react-query';
import { QueryError } from '../components/QueryError';

const Classificacao = () => {
  const { season, loading: ctxLoading } = useSeasonContext();

  // TanStack Query: queryKey inclui season.id → auto-refetch ao trocar temporada
  const { data: rawData, isLoading: queryLoading, isError, refetch } = useQuery({
    queryKey: ['classificacao', season?.id],
    queryFn: async () => {
      const [standingsRes, matchesRes, teamsRes, stagesRes] = await Promise.all([
        supabase.from('standings').select('*, team:teams(*)').eq('season_id', season!.id),
        supabase.from('matches')
          .select('home_team_id, away_team_id, home_score, away_score, stage_id, status')
          .eq('season_id', season!.id)
          .eq('status', 'finalizado')
          .order('date', { ascending: true }),
        supabase.from('season_teams')
          .select('team:teams(*)')
          .eq('season_id', season!.id),
        supabase.from('stages')
          .select('id')
          .eq('season_id', season!.id)
          .eq('type', 'group')
      ]);
      return {
        standings: standingsRes.data ?? [],
        matches: matchesRes.data ?? [],
        teams: teamsRes.data ?? [],
        groupStageIds: (stagesRes.data ?? []).map((s: any) => s.id)
      };
    },
    enabled: !!season?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Toda a lógica de negócio agora em useMemo — não muda, só o transporte mudou
  const { standings, recentResults } = useMemo(() => {
    if (!rawData || !season) return { standings: [], recentResults: {} };

    const { teams: teamsData, matches: matchesData, groupStageIds } = rawData;
    const baseMap: Record<string, Standing> = {};

    teamsData.forEach((st: any) => {
      const t = st.team;
      if (!t) return;
      baseMap[t.id] = {
        team_id: t.id,
        season_id: season.id,
        played: 0, wins: 0, draws: 0, losses: 0,
        goals_for: 0, goals_against: 0, goal_diff: 0,
        points: 0,
        team: t
      };
    });

    const groupMatches = matchesData.filter((m: any) => groupStageIds.includes(m.stage_id));

    groupMatches.forEach((m: any) => {
      const home = baseMap[m.home_team_id];
      const away = baseMap[m.away_team_id];
      if (!home || !away) return;
      home.played++; away.played++;
      home.goals_for += m.home_score || 0;
      home.goals_against += m.away_score || 0;
      away.goals_for += m.away_score || 0;
      away.goals_against += m.home_score || 0;
      if (m.home_score === m.away_score) {
        home.draws++; away.draws++;
        home.points += 1; away.points += 1;
      } else if ((m.home_score ?? 0) > (m.away_score ?? 0)) {
        home.wins++; away.losses++; home.points += 3;
      } else {
        away.wins++; home.losses++; away.points += 3;
      }
      home.goal_diff = home.goals_for - home.goals_against;
      away.goal_diff = away.goals_for - away.goals_against;
    });

    const finalStandings = Object.values(baseMap).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return (a.team?.name || '').localeCompare(b.team?.name || '');
    });

    const resultsMap: Record<string, ('W' | 'D' | 'L')[]> = {};
    groupMatches.forEach((m: any) => {
      const add = (id: string, r: 'W' | 'D' | 'L') => { if (!resultsMap[id]) resultsMap[id] = []; resultsMap[id].push(r); };
      if (m.home_score === m.away_score) { add(m.home_team_id, 'D'); add(m.away_team_id, 'D'); }
      else if ((m.home_score ?? 0) > (m.away_score ?? 0)) { add(m.home_team_id, 'W'); add(m.away_team_id, 'L'); }
      else { add(m.home_team_id, 'L'); add(m.away_team_id, 'W'); }
    });

    return { standings: finalStandings, recentResults: resultsMap };
  }, [rawData, season]);

  if (isError && !rawData) return <QueryError message="Erro ao carregar a classificação." onRetry={refetch} />;
  if (queryLoading || ctxLoading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  const dotColor = (r: 'W' | 'D' | 'L') =>
    r === 'W' ? '#059669' : r === 'L' ? '#dc2626' : '#94a3b8';

  return (
    <div className="page-fluid animate-fade">
      <h1 className="section-title"><Table /> Classificação {season && <span style={{ fontSize: '0.6em', color: 'var(--text-muted)', fontWeight: 600 }}>{season.year}</span>}</h1>

      <div className="fs-table-container">
        {standings.length === 0 && !loading ? (
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontWeight: 700 }}>Nenhum dado de classificação disponível.</p>
        ) : (
          <table className="standings-table" style={{ fontSize: undefined }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>POS</th>
                <th>Time</th>
                <th className="number-cell">P</th>
                <th className="number-cell">J</th>
                <th className="number-cell">V</th>
                <th className="number-cell">E</th>
                <th className="number-cell">D</th>
                <th className="number-cell mobile-hide">GP</th>
                <th className="number-cell mobile-hide">GC</th>
                <th className="number-cell">SG</th>
                <th className="number-cell mobile-hide-xs" style={{ color: 'var(--primary-color)' }}>%</th>
                <th className="mobile-hide-xs" style={{ textAlign: 'right', paddingRight: '1rem', fontSize: '0.7rem', letterSpacing: '1px', whiteSpace: 'nowrap' }}>ÜLT. JOGOS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => {
                const perc = s.played > 0 ? Math.round((s.points / (s.played * 3)) * 100) : 0;
                const results = recentResults[s.team_id] || [];
                return (
                  <tr key={s.team_id}>
                    <td style={{ textAlign: 'center', width: '30px', padding: '0' }}>
                      <div className={`fs-pos ${idx < 4 ? 'qualified' : ''}`}>{idx + 1}.</div>
                    </td>
                    <td>
                      <Link to={`/time/${s.team_id}`} className="team-cell fs-team-cell">
                        <img src={s.team?.logo_url} className="fs-team-logo" alt="" />
                        <span className="fs-team-name-table">{s.team?.name}</span>
                      </Link>
                    </td>
                    <td className="number-cell points" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>{s.points}</td>
                    <td className="number-cell">{s.played}</td>
                    <td className="number-cell">{s.wins}</td>
                    <td className="number-cell">{s.draws}</td>
                    <td className="number-cell">{s.losses}</td>
                    <td className="number-cell mobile-hide">{s.goals_for}</td>
                    <td className="number-cell mobile-hide">{s.goals_against}</td>
                    <td className="number-cell" style={{ color: s.goal_diff > 0 ? 'var(--primary-color)' : s.goal_diff < 0 ? 'var(--error)' : 'inherit', fontWeight: 600 }}>
                      {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
                    </td>
                    <td className="number-cell mobile-hide-xs" style={{ fontWeight: 700 }}>{perc}%</td>
                    <td className="mobile-hide-xs" style={{ textAlign: 'right', paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px', alignItems: 'center' }}>
                        {results.map((r, i) => (
                          <div key={i} style={{
                            width: 9, height: 9, borderRadius: '50%',
                            background: dotColor(r),
                            boxShadow: `0 0 4px ${dotColor(r)}`,
                            flexShrink: 0
                          }} title={r === 'W' ? 'Vitória' : r === 'L' ? 'Derrota' : 'Empate'} />
                        ))}
                        {Array(Math.max(0, 6 - results.length)).fill(0).map((_, i) => (
                          <div key={`e${i}`} style={{ width: 9, height: 9, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div><span style={{ color: 'var(--primary-color)' }}>●</span> Classifica para Semifinal</div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#00e676', marginRight: 4 }} />Vitória</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#777', marginRight: 4 }} />Empate</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ff5252', marginRight: 4 }} />Derrota</span>
        </div>
      </div>
      <div className="rules-section animate-fade">
        <h3 className="rules-title"><Info size={16} /> Critérios de Desempate</h3>
        <div className="rules-grid">
          <div className="rule-item">
            <span className="rule-number">1</span>
            <div className="rule-info">
              <span className="rule-label">Vitórias</span>
              <p className="rule-desc">Maior número de vitórias</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-number">2</span>
            <div className="rule-info">
              <span className="rule-label">Saldo de Gols</span>
              <p className="rule-desc">Gols marcados menos sofridos</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-number">3</span>
            <div className="rule-info">
              <span className="rule-label">Gols Pró</span>
              <p className="rule-desc">Maior quantidade de gols feitos</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-number">4</span>
            <div className="rule-info">
              <span className="rule-label">Confronto Direto</span>
              <p className="rule-desc">Resultado entre as equipes</p>
            </div>
          </div>
          <div className="rule-item">
            <span className="rule-number">5</span>
            <div className="rule-info">
              <span className="rule-label">Cartões</span>
              <p className="rule-desc">Menor número de punições</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .section-title { font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; color: var(--primary-dark); }
        .section-title svg { color: var(--primary-color); width: 20px; height: 20px; }
        
        .fs-table-container {
          background: var(--card-bg);
          overflow-x: auto;
          WebkitOverflowScrolling: touch;
          margin-bottom: 1rem;
        }

        .standings-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        
        .standings-table th {
          font-weight: 500;
          text-align: center;
          padding: 8px 4px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .standings-table td {
          padding: 6px 4px;
          border-bottom: 1px solid var(--border-color);
          text-align: center;
          white-space: nowrap;
        }

        .standings-table th:nth-child(2),
        .standings-table td:nth-child(2) {
          text-align: left;
        }

        .fs-pos {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          font-weight: 800;
          font-size: 0.7rem;
          margin: 0 auto;
          color: var(--text-muted);
        }
        .fs-pos.qualified { background: #0284c7; color: white; }

        .fs-team-cell {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .fs-team-logo { width: 22px; height: 22px; object-fit: contain; }
        .fs-team-name-table { font-weight: 700; color: var(--text-main); font-size: 0.95rem; }

        /* REGRAS DE DESEMPATE STYLES */
        .rules-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background: var(--surface-alt);
          border-radius: 20px;
          border: 1px solid var(--border-color);
        }
        .rules-title {
          font-size: 0.8rem;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-main);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .rule-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--card-bg);
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid var(--border-color);
          transition: transform 0.2s;
        }
        .rule-item:hover { transform: translateY(-2px); }
        .rule-number {
          width: 24px;
          height: 24px;
          background: var(--primary-color);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          font-size: 0.65rem;
          flex-shrink: 0;
        }
        .rule-label { font-size: 0.75rem; font-weight: 800; color: var(--text-main); display: block; line-height: 1.2; }
        .rule-desc { font-size: 0.6rem; color: var(--text-muted); margin: 2px 0 0; line-height: 1.2; }

        @media (max-width: 900px) {
          .page-fluid { padding: 16px; }
          .rules-grid { grid-template-columns: 1fr; gap: 8px; }
          .rules-section { padding: 1rem; margin-top: 1rem; border-radius: 16px; }
          .rule-item { padding: 10px; border-radius: 12px; }
          .rule-label { font-size: 0.75rem; }
          .rule-desc { font-size: 0.55rem; }
          .standings-table { font-size: 0.7rem; }
          .fs-team-name-table { font-size: 0.8rem; }
          .fs-team-logo { width: 16px; height: 16px; }
        }
        @media (max-width: 480px) {
          .rules-grid { grid-template-columns: 1fr; }
        }
        
        .page-fluid {
          max-width: 1600px;
          margin: 0 auto;
          padding: 40px;
        }

        @media (min-width: 1200px) {
          .standings-table { font-size: 1rem; }
          .fs-team-name-table { font-size: 1.1rem; }
          .fs-team-logo { width: 28px; height: 28px; }
          .standings-table th, .standings-table td { padding: 12px 8px; }
        }
      `}</style>
    </div>
  );
};

export default Classificacao;
