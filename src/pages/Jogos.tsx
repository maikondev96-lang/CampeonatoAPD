import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Match, MatchEvent } from '../types';
import { Calendar, Loader2, ChevronRight, ChevronDown, ChevronUp, Goal, AlertCircle } from 'lucide-react';
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
    const { data } = await supabase.from('matches').select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)').order('round').order('date');
    if (data) {
      setJogos(data);
      // Find first non-finished match round
      const firstNotFinished = data.find(j => j.status !== 'finalizado');
      if (firstNotFinished) {
        // Scroll to that round after render
        setTimeout(() => {
          const el = document.getElementById(`round-${firstNotFinished.round}`);
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

        setEvents(prev => ({ ...prev, [matchId]: enriched }));
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
                {matches[0].phase === 'grupo' ? `Rodada ${round}` : matches[0].phase.toUpperCase()}
              </h3>
            </div>
            
            {matches.map((jogo, idx) => {
              const getPlaceholder = (isHome: boolean) => {
                if (jogo.phase === 'semifinal') {
                  if (idx === 0) return isHome ? '1º Colocado' : '4º Colocado';
                  return isHome ? '2º Colocado' : '3º Colocado';
                }
                if (jogo.phase === 'terceiro_lugar') return isHome ? 'A definir (S1)' : 'A definir (S2)';
                if (jogo.phase === 'final') return isHome ? 'Vencedor Semi 1' : 'Vencedor Semi 2';
                return 'A definir';
              };

              return (
                <div key={jogo.id} className="card card-hover" style={{ padding: 0, overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid var(--border-color)' }}>
                  <div 
                    className="match-item" 
                    onClick={() => toggleExpand(jogo.id)} 
                    style={{ 
                      cursor: 'pointer', 
                      padding: '0.75rem 1.25rem',
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 1fr',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-dark)', textAlign: 'right' }}>
                        {jogo.home_team?.name || getPlaceholder(true)}
                      </span>
                      {jogo.home_team?.logo_url ? (
                        <img src={jogo.home_team.logo_url} style={{ width: 28, height: 28, objectFit: 'contain' }} alt="" />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 900 }}>?</div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary-dark)', padding: '5px 14px', borderRadius: '6px', color: 'white', fontWeight: 950, fontSize: '1.1rem' }}>
                        {jogo.status === 'finalizado' ? (
                          <>
                            <span>{jogo.home_score}</span>
                            <span style={{ opacity: 0.3 }}>-</span>
                            <span>{jogo.away_score}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.85rem' }}>{jogo.time ? jogo.time.slice(0, 5) : 'H/D'}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {jogo.date ? jogo.date.split('-').reverse().join('/') : 'Data a definir'}
                        </span>
                        {jogo.status === 'finalizado' ? (
                           <span style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--primary-color)', textTransform: 'uppercase' }}>Encerrado</span>
                        ) : !jogo.time && (
                           <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', opacity: 0.7 }}>Horário a definir</span>
                        )}
                      </div>
                    </div>
  
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-start' }}>
                      {jogo.away_team?.logo_url ? (
                        <img src={jogo.away_team.logo_url} style={{ width: 28, height: 28, objectFit: 'contain' }} alt="" />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 900 }}>?</div>
                      )}
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>
                        {jogo.away_team?.name || getPlaceholder(false)}
                      </span>
                    </div>
                  </div>

                {expanded === jogo.id && (
                  <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                      {/* Home Events */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'right' }}>
                        {events[jogo.id]?.filter(e => e.player?.team_id === jogo.home_team_id).map(e => (
                          <div key={e.id} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{e.minute ? `${e.minute}'` : ''}</span>
                            <span style={{ fontWeight: 500 }}>{e.player?.name}</span>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px' }}>
                              {e.type === 'gol' && <Goal size={14} color="var(--primary-color)" />}
                              {e.type === 'cartao_amarelo' && <div style={{ width: 10, height: 14, background: '#ffd600', borderRadius: 2 }} />}
                              {e.type === 'cartao_vermelho' && <div style={{ width: 10, height: 14, background: '#ff5252', borderRadius: 2 }} />}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Away Events */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {events[jogo.id]?.filter(e => e.player?.team_id === jogo.away_team_id).map(e => (
                          <div key={e.id} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '16px' }}>
                              {e.type === 'gol' && <Goal size={14} color="var(--primary-color)" />}
                              {e.type === 'cartao_amarelo' && <div style={{ width: 10, height: 14, background: '#ffd600', borderRadius: 2 }} />}
                              {e.type === 'cartao_vermelho' && <div style={{ width: 10, height: 14, background: '#ff5252', borderRadius: 2 }} />}
                            </span>
                            <span style={{ fontWeight: 500 }}>{e.player?.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{e.minute ? `${e.minute}'` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                      <Link to={`/jogos/${jogo.id}`} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                        Ver lances completos <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default Jogos;
