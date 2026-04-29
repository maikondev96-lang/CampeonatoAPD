import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, MatchEvent } from '../types';
import { Calendar, Clock, ChevronLeft, Loader2 } from 'lucide-react';

const MatchDetail = () => {
  const { id } = useParams();
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [homeHistory, setHomeHistory] = useState<Match[]>([]);
  const [awayHistory, setAwayHistory] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lances' | 'historico'>('lances');

  useEffect(() => {
    if (id) fetchMatchData();
  }, [id]);

  const fetchMatchData = async () => {
    setLoading(true);
    try {
      // 1. Dados da Partida
      const { data: mData, error: mError } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id)
        .single();

      if (mError) throw mError;
      setMatch(mData);

      // BUG FIX: dois aliases para mesma tabela quebra no Supabase.
      // Busca eventos puros, depois resolve jogadores via lookup.
      const { data: eRaw } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', id);
      
      if (eRaw && eRaw.length > 0) {
        const pIds = [...new Set([
          ...eRaw.map(e => e.player_id).filter(Boolean),
          ...eRaw.map(e => e.assist_player_id).filter(Boolean)
        ])];
        const { data: pLookup } = await supabase.from('players').select('id, name, team_id').in('id', pIds);
        const pMap: Record<string, any> = {};
        (pLookup || []).forEach(p => { pMap[p.id] = p; });
        const enriched = eRaw.map(ev => ({
          ...ev,
          player: pMap[ev.player_id] || null,
          assist_player: ev.assist_player_id ? pMap[ev.assist_player_id] || null : null
        }));

        // Filtrar amarelos se houver vermelho indireto para o mesmo jogador
        const filtered = enriched.filter(ev => {
          if (ev.type === 'cartao_amarelo') {
            const hasIndirect = enriched.some(other => 
              other.player_id === ev.player_id && 
              other.type === 'cartao_vermelho_indireto'
            );
            return !hasIndirect;
          }
          return true;
        });

        setEvents([...filtered].sort((a, b) => (a.minute || 0) - (b.minute || 0)));
      } else {
        setEvents([]);
      }

      // 3. Histórico Time da Casa
      const { data: hHistory } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${mData.home_team_id},away_team_id.eq.${mData.home_team_id}`)
        .eq('status', 'finalizado')
        .neq('id', id)
        .order('date', { ascending: false })
        .limit(5);
      setHomeHistory(hHistory || []);

      // 4. Histórico Time de Fora
      const { data: aHistory } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .or(`home_team_id.eq.${mData.away_team_id},away_team_id.eq.${mData.away_team_id}`)
        .eq('status', 'finalizado')
        .neq('id', id)
        .order('date', { ascending: false })
        .limit(5);
      setAwayHistory(aHistory || []);

    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (m: Match, teamId: string) => {
    const isHome = m.home_team_id === teamId;
    const score = isHome ? (m.home_score || 0) - (m.away_score || 0) : (m.away_score || 0) - (m.home_score || 0);
    
    if (score > 0) return <span className="result-badge win">V</span>;
    if (score < 0) return <span className="result-badge loss">D</span>;
    return <span className="result-badge draw">E</span>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '10rem' }}><Loader2 className="animate-spin" /></div>;
  if (!match) return <div>Não encontrado</div>;

  return (
    <div className="animate-fade">
      <Link to="/jogos" className="btn btn-secondary" style={{ marginBottom: '1.5rem', padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
        <ChevronLeft size={16} /> Voltar para Jogos
      </Link>

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
              <img src={match.home_team.logo_url} className="team-logo-large" />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#64748b', fontWeight: 950 }}>?</div>
            )}
            <div className="team-name-large">{match.home_team?.name || 'A definir'}</div>
          </div>

          <div className="score-display" style={{ flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="score-number">{match.status === 'agendado' ? '-' : match.home_score}</div>
              
              {match.phase !== 'grupo' && match.home_penalties !== null && match.home_penalties !== undefined ? (
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
              <img src={match.away_team.logo_url} className="team-logo-large" />
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
                const iconColor = (event.type === 'gol' || event.type === 'gol_penalti') ? 'var(--primary-color)' : (event.type === 'cartao_vermelho_direto' || event.type === 'cartao_vermelho_indireto' || event.type === 'penalti_perdido_tempo_normal') ? '#dc2626' : '#ffd600';
                
                return (
                  <div key={event.id} style={{ 
                    display: 'flex', 
                    flexDirection: isHome ? 'row' : 'row-reverse',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.85rem',
                    gap: '10px'
                  }}>
                    {/* Time e Ícone */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, minWidth: '60px', justifyContent: isHome ? 'flex-start' : 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{event.minute}'</span>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {(event.type === 'gol' || event.type === 'gol_penalti') && <span>⚽</span>}
                        {event.type === 'penalti_perdido_tempo_normal' && <span>❌</span>}
                        {event.type === 'cartao_amarelo' && <div style={{ width: 8, height: 12, background: '#ffd600', borderRadius: 1 }} />}
                        {(event.type === 'cartao_vermelho_direto' || event.type === 'cartao_vermelho_indireto') && <div style={{ width: 8, height: 12, background: '#ff5252', borderRadius: 1 }} />}
                      </div>
                    </div>

                    {/* Nome e Detalhes */}
                    <div style={{ 
                      flex: 1, 
                      textAlign: isHome ? 'left' : 'right',
                      display: 'flex',
                      flexDirection: isHome ? 'row' : 'row-reverse',
                      alignItems: 'center',
                      gap: '4px',
                      overflow: 'hidden'
                    }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.player?.name}
                        {event.type === 'gol_penalti' && (
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>(Pênalti)</span>
                        )}
                        {event.type === 'penalti_perdido_tempo_normal' && (
                          <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600, marginLeft: '4px' }}>(Pênalti perdido)</span>
                        )}
                      </span>
                      {event.assist_player && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          ({event.assist_player.name})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {events.some(e => e.type === 'penalti_convertido' || e.type === 'penalti_perdido') && (
                <div style={{ marginTop: '2rem', borderTop: '2px dashed #cbd5e1', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 10px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Pênaltis</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a' }}>{match.home_penalties} - {match.away_penalties}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(() => {
                      let homePenCount = 0;
                      let awayPenCount = 0;
                      return events.filter(e => e.type === 'penalti_convertido' || e.type === 'penalti_perdido').map(event => {
                        const isHome = event.player?.team_id === match.home_team_id;
                        const penNumber = isHome ? ++homePenCount : ++awayPenCount;
                        const teamLogo = isHome ? match.home_team?.logo_url : match.away_team?.logo_url;
                        const isConverted = event.type === 'penalti_convertido';
                        const statusText = isConverted ? '(Pênalti)' : '(Pênalti perdido)';
                        const statusColor = isConverted ? '#64748b' : '#dc2626';

                        return (
                          <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center' }}>
                            {/* HOME TEAM SIDE */}
                            {isHome ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '15px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', width: '16px', textAlign: 'center' }}>{penNumber}</span>
                                {teamLogo ? (
                                  <img src={teamLogo} style={{ width: 20, height: 20, objectFit: 'contain' }} alt="logo" />
                                ) : (
                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900 }}>?</div>
                                )}
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{event.player?.name || 'Jogador'}</span>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor }}>{statusText}</span>
                              </div>
                            ) : <div></div>}

                            {/* AWAY TEAM SIDE */}
                            {!isHome ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingLeft: '15px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor }}>{statusText}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{event.player?.name || 'Jogador'}</span>
                                {teamLogo ? (
                                  <img src={teamLogo} style={{ width: 20, height: 20, objectFit: 'contain' }} alt="logo" />
                                ) : (
                                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900 }}>?</div>
                                )}
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', width: '16px', textAlign: 'center' }}>{penNumber}</span>
                              </div>
                            ) : <div></div>}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="h2h-container">
          {/* Histórico Home */}
          <div className="h2h-section">
            <h3 className="h2h-title">Últimos jogos: {match.home_team?.name}</h3>
            <div className="card h2h-card">
              {homeHistory.map(h => (
                <div key={h.id} className="h2h-row">
                  <span className="h2h-date">{h.date ? h.date.split('-').reverse().slice(0,2).join('/') : '??/??'}</span>
                  <div className="h2h-teams">
                    <div className={`h2h-team-row ${h.home_team_id === match.home_team_id ? 'active' : ''}`}>
                      <img src={h.home_team?.logo_url} className="h2h-logo" />
                      {h.home_team?.name}
                    </div>
                    <div className={`h2h-team-row ${h.away_team_id === match.home_team_id ? 'active' : ''}`}>
                      <img src={h.away_team?.logo_url} className="h2h-logo" />
                      {h.away_team?.name}
                    </div>
                  </div>
                  <div className="h2h-score">{h.home_score} - {h.away_score}</div>
                  {getResultBadge(h, match.home_team_id)}
                </div>
              ))}
            </div>
          </div>

          {/* Histórico Away */}
          <div className="h2h-section" style={{ marginTop: '2rem' }}>
            <h3 className="h2h-title">Últimos jogos: {match.away_team?.name}</h3>
            <div className="card h2h-card">
              {awayHistory.map(h => (
                <div key={h.id} className="h2h-row">
                  <span className="h2h-date">{h.date ? h.date.split('-').reverse().slice(0,2).join('/') : '??/??'}</span>
                  <div className="h2h-teams">
                    <div className={`h2h-team-row ${h.home_team_id === match.away_team_id ? 'active' : ''}`}>
                      <img src={h.home_team?.logo_url} className="h2h-logo" />
                      {h.home_team?.name}
                    </div>
                    <div className={`h2h-team-row ${h.away_team_id === match.away_team_id ? 'active' : ''}`}>
                      <img src={h.away_team?.logo_url} className="h2h-logo" />
                      {h.away_team?.name}
                    </div>
                  </div>
                  <div className="h2h-score">{h.home_score} - {h.away_score}</div>
                  {getResultBadge(h, match.away_team_id)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchDetail;
