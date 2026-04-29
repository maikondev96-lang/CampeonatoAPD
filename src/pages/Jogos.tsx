import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Match, MatchEvent } from '../types';
import { Calendar, Loader2, ChevronRight, ChevronDown, ChevronUp, AlertCircle, Footprints } from 'lucide-react';
import { Link } from 'react-router-dom';

const Jogos = () => {
  const [jogos, setJogos] = useState<Match[]>([]);
  const [events, setEvents] = useState<Record<string, MatchEvent[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const currentRoundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJogos();
  }, []);

  const fetchJogos = async () => {
    const { data } = await supabase.from('matches').select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)');
    if (data) {
      const phaseOrder: Record<string, number> = { 'grupo': 1, 'semifinal': 2, 'terceiro_lugar': 3, 'final': 4 };
      const sorted = [...data].sort((a, b) => {
        if (phaseOrder[a.phase] !== phaseOrder[b.phase]) return phaseOrder[a.phase] - phaseOrder[b.phase];
        if (a.phase === 'grupo' && a.round !== b.round) return (a.round || 0) - (b.round || 0);
        
        const dateA = a.date || '9999-99-99';
        const dateB = b.date || '9999-99-99';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        
        const timeA = a.time || '99:99';
        const timeB = b.time || '99:99';
        return timeA.localeCompare(timeB);
      });

      setJogos(sorted);
      // Find first non-finished match round
      const firstNotFinished = sorted.find(j => j.status !== 'finalizado');
      if (firstNotFinished) {
        // Scroll to that round after render
        setTimeout(() => {
          const id = firstNotFinished.phase === 'grupo' ? `round-${firstNotFinished.round}` : `phase-${firstNotFinished.phase}`;
          const el = document.getElementById(id);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    }
    setLoading(false);
  };

  const toggleExpand = async (matchId: string) => {
    if (expanded === matchId) {
      setExpanded(null);
      return;
    }

    if (!events[matchId]) {
      // BUG FIX: Supabase não aceita dois aliases para a mesma tabela (players).
      // Solução: buscar eventos sem join e resolver nomes via lookup em memória.
      const { data: evData } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute');

      if (evData && evData.length > 0) {
        const playerIds = [...new Set([
          ...evData.map(e => e.player_id).filter(Boolean),
          ...evData.map(e => e.assist_player_id).filter(Boolean)
        ])];

        const { data: pData } = await supabase
          .from('players')
          .select('id, name, team_id')
          .in('id', playerIds);

        const playerMap: Record<string, { id: string; name: string; team_id: string }> = {};
        (pData || []).forEach(p => { playerMap[p.id] = p; });

        const enriched = evData.map(ev => ({
          ...ev,
          player: playerMap[ev.player_id] || null,
          assist_player: ev.assist_player_id ? playerMap[ev.assist_player_id] || null : null
        }));

        // Filtrar amarelos se houver vermelho indireto (Regra Brasileirão)
        const filtered = enriched.filter(ev => {
          if (ev.type === 'cartao_amarelo') {
            return !enriched.some(other => 
              other.player_id === ev.player_id && 
              other.type === 'cartao_vermelho_indireto'
            );
          }
          return true;
        });

        setEvents(prev => ({ ...prev, [matchId]: filtered }));
      } else {
        setEvents(prev => ({ ...prev, [matchId]: [] }));
      }
    }
    setExpanded(matchId);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  const groupedByRound = jogos.reduce((acc, match) => {
    const r = match.round;
    if (!acc[r]) acc[r] = [];
    acc[r].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  return (
    <div className="animate-fade">
      <h1 className="section-title"><Calendar /> Calendário de Jogos</h1>
      
      {jogos.length === 0 ? <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum jogo cadastrado</p> : (
        Object.entries(groupedByRound).map(([round, matches]) => (
          <div key={round} id={`round-${round}`} style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '4px', height: '18px', background: 'var(--primary-color)', borderRadius: '2px' }}></div>
              <h3 style={{ textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary-dark)', letterSpacing: '1px' }}>
                {matches[0].phase === 'grupo'
                  ? `Rodada ${round}`
                  : matches[0].phase === 'terceiro_lugar'
                    ? 'Disputa de 3º Lugar'
                    : matches[0].phase === 'semifinal'
                      ? 'Semifinal'
                      : matches[0].phase === 'final'
                        ? 'Final'
                        : matches[0].phase.toUpperCase()}
              </h3>
            </div>
            
            {matches.map((jogo, idx) => {
              const phase = (jogo.phase || '').toLowerCase();
              const getPlaceholder = (isHome: boolean) => {
                if (phase === 'semifinal') {
                  if (idx === 0) return isHome ? '1º Colocado' : '4º Colocado';
                  return isHome ? '2º Colocado' : '3º Colocado';
                }
                if (phase === 'terceiro_lugar') return isHome ? 'A definir (Semi 1)' : 'A definir (Semi 2)';
                if (phase === 'final') return isHome ? 'Vencedor Semi 1' : 'Vencedor Semi 2';
                return 'A definir';
              };

              const homeName = jogo.home_team?.name || getPlaceholder(true);
              const awayName = jogo.away_team?.name || getPlaceholder(false);

              const homeWin = jogo.status === 'finalizado' && ((jogo.home_score || 0) > (jogo.away_score || 0) || ((jogo.home_score === jogo.away_score) && (jogo.home_penalties || 0) > (jogo.away_penalties || 0)));
              const awayWin = jogo.status === 'finalizado' && ((jogo.away_score || 0) > (jogo.home_score || 0) || ((jogo.home_score === jogo.away_score) && (jogo.away_penalties || 0) > (jogo.home_penalties || 0)));

              return (
                <div key={jogo.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div 
                    className="match-item" 
                    onClick={() => toggleExpand(jogo.id)} 
                    style={{ 
                      cursor: 'pointer', 
                      padding: '0.75rem 1.25rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      gap: '4px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end', minWidth: 0, flex: 1 }}>
                      <span className={`team-name-premium ${homeWin ? 'is-winner' : awayWin ? 'is-loser' : ''}`} style={{ fontWeight: 800, fontSize: '0.9rem', color: '#020617', textAlign: 'right', flex: 1 }}>
                        {homeName}
                      </span>
                      {jogo.home_team?.logo_url ? (
                        <img src={jogo.home_team.logo_url} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} alt="" />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#64748b', fontWeight: 900, flexShrink: 0 }}>?</div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div className="score-display-premium" style={{ background: 'transparent', boxShadow: 'none', border: 'none', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {jogo.status === 'finalizado' || jogo.status === 'ao_vivo' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                              <span className={`score-number-premium ${homeWin ? 'is-winner' : ''}`}>{jogo.home_score}</span>
                              {jogo.phase !== 'grupo' && jogo.home_penalties !== null ? (
                                <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#64748b', margin: '0 4px', letterSpacing: '1px' }}>
                                  ({jogo.home_penalties} <span style={{ opacity: 0.5, margin: '0 2px' }}>×</span> {jogo.away_penalties})
                                </span>
                              ) : (
                                <span className="score-divider-premium" style={{ opacity: 0.3 }}>-</span>
                              )}
                              <span className={`score-number-premium ${awayWin ? 'is-winner' : ''}`}>{jogo.away_score}</span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '1.1rem', fontWeight: 950, color: jogo.time ? 'var(--primary-color)' : 'var(--text-muted)', opacity: jogo.time ? 1 : 0.4 }}>
                            {jogo.time ? jogo.time.slice(0, 5) : 'vs'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: jogo.status === 'adiado' ? 'var(--error)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {jogo.status === 'adiado' ? '⚠️ Adiado' : jogo.date ? jogo.date.split('-').reverse().join('/') : 'Data a definir'}
                        </span>
                        {jogo.status === 'finalizado' ? (
                           <span style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--primary-color)', textTransform: 'uppercase' }}>Encerrado</span>
                        ) : jogo.status === 'adiado' ? (
                           <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--error)', opacity: 0.8 }}>Data a definir</span>
                        ) : !jogo.time && (
                           <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.7 }}>Horário a definir</span>
                        )}
                      </div>
                    </div>
  
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-start', minWidth: 0, flex: 1 }}>
                      {jogo.away_team?.logo_url ? (
                        <img src={jogo.away_team.logo_url} style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} alt="" />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#64748b', fontWeight: 900, flexShrink: 0 }}>?</div>
                      )}
                      <span className={`team-name-premium ${awayWin ? 'is-winner' : homeWin ? 'is-loser' : ''}`} style={{ fontWeight: 800, fontSize: '0.9rem', color: '#020617', textAlign: 'left', flex: 1 }}>
                        {awayName}
                      </span>
                    </div>
                  </div>

                {expanded === jogo.id && (
                  <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      {/* Home Regular Events */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'right' }}>
                        {events[jogo.id]?.filter(e => e.type !== 'penalti_convertido' && e.type !== 'penalti_perdido' && e.player?.team_id === jogo.home_team_id).map(e => (
                          <div key={e.id} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', fontWeight: 800, color: '#0f172a' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', opacity: 0.6 }}>{e.minute ? `${e.minute}'` : ''}</span>
                            <span>{e.player?.name} <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{e.type === 'gol_penalti' ? '(Pênalti)' : e.type === 'penalti_perdido_tempo_normal' ? '(Pênalti perdido)' : ''}</span></span>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px' }}>
                              {(e.type === 'gol' || e.type === 'gol_penalti') && <span style={{ fontSize: '1rem' }}>⚽</span>}
                              {e.type === 'penalti_perdido_tempo_normal' && <span style={{ fontSize: '1rem' }}>❌</span>}
                              {e.type === 'cartao_amarelo' && <div style={{ width: 10, height: 14, background: '#ffd600', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />}
                              {(e.type === 'cartao_vermelho_direto' || e.type === 'cartao_vermelho_indireto') && <div style={{ width: 10, height: 14, background: '#ff5252', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Away Regular Events */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {events[jogo.id]?.filter(e => e.type !== 'penalti_convertido' && e.type !== 'penalti_perdido' && e.player?.team_id === jogo.away_team_id).map(e => (
                          <div key={e.id} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#0f172a' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px' }}>
                              {(e.type === 'gol' || e.type === 'gol_penalti') && <span style={{ fontSize: '1rem' }}>⚽</span>}
                              {e.type === 'penalti_perdido_tempo_normal' && <span style={{ fontSize: '1rem' }}>❌</span>}
                              {e.type === 'cartao_amarelo' && <div style={{ width: 10, height: 14, background: '#ffd600', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />}
                              {(e.type === 'cartao_vermelho_direto' || e.type === 'cartao_vermelho_indireto') && <div style={{ width: 10, height: 14, background: '#ff5252', borderRadius: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />}
                            </span>
                            <span>{e.player?.name} <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{e.type === 'gol_penalti' ? '(Pênalti)' : e.type === 'penalti_perdido_tempo_normal' ? '(Pênalti perdido)' : ''}</span></span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', opacity: 0.6 }}>{e.minute ? `${e.minute}'` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                      <Link 
                        to={`/jogos/${jogo.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '0.6rem 1.5rem',
                          background: 'white',
                          border: '2px solid #0f172a',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '0.75rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 0 #0f172a'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 0 #0f172a';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 0 #0f172a';
                        }}
                      >
                        Ver Lances Completos <span style={{ fontSize: '1rem' }}>›</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))
    )}
  </div>
);
};

export default Jogos;
