import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Standing } from '../types';
import { Table, Loader2 } from 'lucide-react';
import { useSeasonContext } from '../components/SeasonContext';
import { getSmartData } from '../utils/smartCache';

const Classificacao = () => {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [recentResults, setRecentResults] = useState<Record<string, ('W' | 'D' | 'L')[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (season) fetchStandings();
  }, [season]);

  const fetchStandings = async () => {
    if (!season) return;
    setLoading(true);

    try {
      const data = await getSmartData(`classificacao_${season.id}`, async () => {
        const [standingsRes, matchesRes, teamsRes, stagesRes] = await Promise.all([
          supabase.from('standings').select('*, team:teams(*)').eq('season_id', season.id),
          supabase.from('matches')
            .select('home_team_id, away_team_id, home_score, away_score, stage_id, status')
            .eq('season_id', season.id)
            .eq('status', 'finalizado')
            .order('date', { ascending: true }),
          supabase.from('season_teams')
            .select('team:teams(*)')
            .eq('season_id', season.id),
          supabase.from('stages')
            .select('id')
            .eq('season_id', season.id)
            .eq('type', 'group')
        ]);

        return {
          standings: standingsRes.data || [],
          matches: matchesRes.data || [],
          teams: teamsRes.data || [],
          groupStageIds: (stagesRes.data || []).map(s => s.id)
        };
      });

      const { standings: standingsData, matches: matchesData, teams: teamsData, groupStageIds } = data;
      const standingsRes = { data: standingsData };
      const matchesRes = { data: matchesData };
      const teamsRes = { data: teamsData };

      let finalStandings: Standing[] = [];

    if (teamsRes.data) {
      const baseMap: Record<string, Standing> = {};
      teamsRes.data.forEach((st: any) => {
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

      // Filter only group stage matches
      const groupMatches = (matchesRes.data || []).filter(m =>
        groupStageIds.includes(m.stage_id)
      );

      groupMatches.forEach(m => {
        const home = baseMap[m.home_team_id];
        const away = baseMap[m.away_team_id];
        if (!home || !away) return;

        home.played++;
        away.played++;
        home.goals_for += m.home_score || 0;
        home.goals_against += m.away_score || 0;
        away.goals_for += m.away_score || 0;
        away.goals_against += m.home_score || 0;

        if (m.home_score === m.away_score) {
          home.draws++; away.draws++;
          home.points += 1; away.points += 1;
        } else if ((m.home_score ?? 0) > (m.away_score ?? 0)) {
          home.wins++; away.losses++;
          home.points += 3;
        } else {
          away.wins++; home.losses++;
          away.points += 3;
        }
        home.goal_diff = home.goals_for - home.goals_against;
        away.goal_diff = away.goals_for - away.goals_against;
      });

      finalStandings = Object.values(baseMap).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        return (a.team?.name || '').localeCompare(b.team?.name || '');
      });

      // Recent results
      const resultsMap: Record<string, ('W' | 'D' | 'L')[]> = {};
      groupMatches.forEach(m => {
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
      setRecentResults(resultsMap);
    }
    
    setStandings(finalStandings);
    setLoading(false);
  };

  if (loading || ctxLoading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  const dotColor = (r: 'W' | 'D' | 'L') =>
    r === 'W' ? '#059669' : r === 'L' ? '#dc2626' : '#94a3b8';

  return (
    <div className="page-fluid animate-fade">
      <h1 className="section-title"><Table /> Classificação {season && <span style={{ fontSize: '0.6em', color: 'var(--text-muted)', fontWeight: 600 }}>{season.year}</span>}</h1>

      <div className="card" style={{ padding: 0, overflowX: 'auto', border: '2px solid var(--border-color)', WebkitOverflowScrolling: 'touch' }}>
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
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        color: idx < 4 ? 'var(--primary-color)' : 'var(--text-muted)'
                      }}>
                        {idx + 1}º
                      </span>
                    </td>
                    <td>
                      <Link to={`/time/${s.team_id}`} className="team-cell" style={{ textDecoration: 'none', cursor: 'pointer' }}>
                        <span style={{
                          width: '6px', height: '24px',
                          background: idx < 4 ? 'var(--primary-color)' : '#94a3b8',
                          borderRadius: '2px', marginRight: '10px', flexShrink: 0
                        }}></span>
                        <img src={s.team?.logo_url} className="team-logo" style={{ width: 32, height: 32 }} alt="" />
                        <span style={{ fontWeight: 950, fontSize: '1rem', color: 'var(--primary-dark)' }}>{s.team?.name}</span>
                      </Link>
                    </td>
                    <td className="number-cell points" style={{ fontSize: '1.2rem', fontWeight: 950 }}>{s.points}</td>
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
    </div>
  );
};

export default Classificacao;
