import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, MatchEvent } from '../types';
import { Calendar, Clock, ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';

const MatchDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'lances' | 'historico'>('lances');

  // 1. DATA LAYER (READ)
  const query = useQuery({
    queryKey: ['matchDetail', id],
    queryFn: async () => {
      if (!id) return null;
      
      // 1.1 Match Core Data
      const { data: mData, error: mError } = await supabase
        .from('matches')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
        .eq('id', id)
        .single();
      if (mError) throw mError;

      // 1.2 Match Events + Player Lookup
      const { data: eRaw } = await supabase.from('match_events').select('*').eq('match_id', id);
      let enrichedEvents: MatchEvent[] = [];
      
      if (eRaw && eRaw.length > 0) {
        const pIds = [...new Set([
          ...eRaw.map(e => e.player_id).filter(Boolean),
          ...eRaw.map(e => e.assist_player_id).filter(Boolean)
        ])];
        const { data: pLookup } = await supabase.from('players').select('id, name, team_id, shirt_number').in('id', pIds);
        const pMap: Record<string, any> = {};
        (pLookup || []).forEach(p => { pMap[p.id] = p; });
        
        enrichedEvents = eRaw.map(ev => ({
          ...ev,
          player: pMap[ev.player_id] || null,
          assist_player: ev.assist_player_id ? pMap[ev.assist_player_id] || null : null
        })).filter(ev => {
          if (ev.type === 'cartao_amarelo') {
            return !eRaw.some(other => other.player_id === ev.player_id && other.type === 'cartao_vermelho_indireto');
          }
          return true;
        }).sort((a, b) => (a.minute || 0) - (b.minute || 0));
      }

      // 1.3 H2H History
      const [hHist, aHist] = await Promise.all([
        supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').or(`home_team_id.eq.${mData.home_team_id},away_team_id.eq.${mData.home_team_id}`).eq('status', 'finalizado').neq('id', id).order('date', { ascending: false }).limit(5),
        supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').or(`home_team_id.eq.${mData.away_team_id},away_team_id.eq.${mData.away_team_id}`).eq('status', 'finalizado').neq('id', id).order('date', { ascending: false }).limit(5)
      ]);

      return {
        match: mData as Match,
        events: enrichedEvents,
        homeHistory: (hHist.data || []) as Match[],
        awayHistory: (aHist.data || []) as Match[]
      };
    },
    enabled: !!id
  });

  const { state, data, refetch } = useQueryEngine(query);

  const getResultBadge = (m: Match, teamId: string) => {
    const isHome = m.home_team_id === teamId;
    const score = isHome ? (m.home_score || 0) - (m.away_score || 0) : (m.away_score || 0) - (m.home_score || 0);
    if (score > 0) return <span className="result-badge win">V</span>;
    if (score < 0) return <span className="result-badge loss">D</span>;
    return <span className="result-badge draw">E</span>;
  };

  return (
    <div className="animate-fade">
      <Link to="/jogos" className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
        <ChevronLeft size={16} /> Voltar para Jogos
      </Link>

      <QueryView state={state} data={data} onRetry={refetch}>
        {(content) => {
          const { match, events, homeHistory, awayHistory } = content;
          return (
            <>
              {/* Placar Principal */}
              <div className="card match-header-card">
                <div className="match-date-info">
                  <Calendar size={14} /> {match.date ? match.date.split('-').reverse().join('/') : 'Data a definir'}
                  {match.time ? (
                    <><Clock size={14} style={{ marginLeft: '10px' }} /> {match.time.slice(0, 5)}</>
                  ) : (
                    <span style={{ marginLeft: '10px', opacity: 0.6 }}>• Horário a definir</span>
                  )}
                </div>

                <div className="score-main-row">
                  <div className="team-col">
                    {match.home_team?.logo_url ? (
                      <img src={match.home_team.logo_url} className="team-logo-large" alt="" />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#64748b', fontWeight: 950 }}>?</div>
                    )}
                    <div className="team-name-large">{match.home_team?.name || 'A definir'}</div>
                  </div>

                  <div className="score-display" style={{ flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="score-number">{match.status === 'agendado' ? '-' : match.home_score}</div>
                      
                      {match.home_penalties !== null && match.home_penalties !== undefined ? (
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#64748b' }}>
                          ({match.home_penalties} <span style={{ opacity: 0.5, margin: '0 4px' }}>×</span> {match.away_penalties})
                        </div>
                      ) : (
                        <div className="score-divider">x</div>
                      )}

                      <div className="score-number">{match.status === 'agendado' ? '-' : match.away_score}</div>
                    </div>
                  </div>

                  <div className="team-col">
                    {match.away_team?.logo_url ? (
                      <img src={match.away_team.logo_url} className="team-logo-large" alt="" />
                    ) : (
                      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#64748b', fontWeight: 950 }}>?</div>
                    )}
                    <div className="team-name-large">{match.away_team?.name || 'A definir'}</div>
                  </div>
                </div>

                <div className={`match-status-label status-${match.status}`} style={{ background: match.status === 'finalizado' ? 'var(--primary-dark)' : undefined, color: match.status === 'finalizado' ? 'white' : undefined, fontWeight: 950 }}>
                  {match.status === 'finalizado' ? 'FIM DE JOGO' : match.status === 'agendado' ? 'AGENDADO' : 'AO VIVO'}
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs-container">
                <button onClick={() => setActiveTab('lances')} className={`tab-btn ${activeTab === 'lances' ? 'active' : ''}`}>SUMÁRIO</button>
                <button onClick={() => setActiveTab('historico')} className={`tab-btn ${activeTab === 'historico' ? 'active' : ''}`}>H2H</button>
              </div>

              {activeTab === 'lances' ? (
                <div className="card timeline-card">
                  {events.length === 0 ? <p className="empty-msg">Nenhum lance registrado.</p> : (
                    <>
                      {events.filter(e => e.type !== 'penalti_convertido' && e.type !== 'penalti_perdido').map(event => {
                        const isHome = event.player?.team_id === match.home_team_id;
                        return (
                          <div key={event.id} style={{ display: 'flex', flexDirection: isHome ? 'row' : 'row-reverse', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, minWidth: '60px', justifyContent: isHome ? 'flex-start' : 'flex-end' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{event.minute}'</span>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {(event.type === 'gol' || event.type === 'gol_penalti') && <span>⚽</span>}
                                {event.type === 'penalti_perdido_tempo_normal' && <span>❌</span>}
                                {event.type === 'cartao_amarelo' && <div style={{ width: 8, height: 12, background: '#ffd600', borderRadius: 1 }} />}
                                {(event.type === 'cartao_vermelho_direto' || event.type === 'cartao_vermelho_indireto') && <div style={{ width: 8, height: 12, background: '#ff5252', borderRadius: 1 }} />}
                              </div>
                            </div>
                            <div style={{ flex: 1, textAlign: isHome ? 'left' : 'right', display: 'flex', flexDirection: isHome ? 'row' : 'row-reverse', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                              <span style={{ fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {event.player?.shirt_number ? `${event.player.shirt_number} - ` : ''}{event.player?.name}
                                {event.type === 'gol_penalti' && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>(Pênalti)</span>}
                              </span>
                              {event.assist_player && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  ({event.assist_player.shirt_number ? `${event.assist_player.shirt_number} - ` : ''}{event.assist_player.name})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : (
                <div className="h2h-container">
                  <div className="h2h-section">
                    <h3 className="h2h-title">Últimos jogos: {match.home_team?.name}</h3>
                    <div className="card h2h-card">
                      {homeHistory.map(h => (
                        <div key={h.id} className="h2h-row">
                          <span className="h2h-date">{h.date ? h.date.split('-').reverse().slice(0,2).join('/') : '??/??'}</span>
                          <div className="h2h-teams">
                            <div className={`h2h-team-row ${h.home_team_id === match.home_team_id ? 'active' : ''}`}><img src={h.home_team?.logo_url} className="h2h-logo" alt="" />{h.home_team?.name}</div>
                            <div className={`h2h-team-row ${h.away_team_id === match.home_team_id ? 'active' : ''}`}><img src={h.away_team?.logo_url} className="h2h-logo" alt="" />{h.away_team?.name}</div>
                          </div>
                          <div className="h2h-score">{h.home_score} - {h.away_score}</div>
                          {getResultBadge(h, match.home_team_id)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h2h-section" style={{ marginTop: '2rem' }}>
                    <h3 className="h2h-title">Últimos jogos: {match.away_team?.name}</h3>
                    <div className="card h2h-card">
                      {awayHistory.map(h => (
                        <div key={h.id} className="h2h-row">
                          <span className="h2h-date">{h.date ? h.date.split('-').reverse().slice(0,2).join('/') : '??/??'}</span>
                          <div className="h2h-teams">
                            <div className={`h2h-team-row ${h.home_team_id === match.away_team_id ? 'active' : ''}`}><img src={h.home_team?.logo_url} className="h2h-logo" alt="" />{h.home_team?.name}</div>
                            <div className={`h2h-team-row ${h.away_team_id === match.away_team_id ? 'active' : ''}`}><img src={h.away_team?.logo_url} className="h2h-logo" alt="" />{h.away_team?.name}</div>
                          </div>
                          <div className="h2h-score">{h.home_score} - {h.away_score}</div>
                          {getResultBadge(h, match.away_team_id)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        }}
      </QueryView>
    </div>
  );
};

export default MatchDetail;
