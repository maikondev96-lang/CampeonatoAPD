import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, MatchEvent, Player } from '../types';
import { Save, ChevronLeft, Plus, Trash2, Loader2, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';

const AdminMatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [homePens, setHomePens] = useState<number>(0);
  const [awayPens, setAwayPens] = useState<number>(0);

  useEffect(() => {
    if (id) fetchMatch(true);
  }, [id]);

  // Calcula placar a partir dos eventos de gol
  useEffect(() => {
    if (match && players.length > 0) {
      const hScore = events.filter(ev =>
        ev.type === 'gol' &&
        players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id
      ).length;
      const aScore = events.filter(ev =>
        ev.type === 'gol' &&
        players.find(p => p.id === ev.player_id)?.team_id === match.away_team_id
      ).length;
      const hPens = events.filter(ev =>
        ev.type === 'penalti_convertido' &&
        players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id
      ).length;
      const aPens = events.filter(ev =>
        ev.type === 'penalti_convertido' &&
        players.find(p => p.id === ev.player_id)?.team_id === match.away_team_id
      ).length;
      setHomeScore(hScore);
      setAwayScore(aScore);
      setHomePens(hPens);
      setAwayPens(aPens);
    }
  }, [events, players, match]);

  const fetchMatch = async (isInitial = true) => {
    try {
      const { data: mData } = await supabase
        .from('matches')
        .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
        .eq('id', id)
        .single();

      if (mData) {
        setMatch(mData);
        if (isInitial) {
          setHomeScore(mData.home_score || 0);
          setAwayScore(mData.away_score || 0);
          setHomePens(mData.home_penalties || 0);
          setAwayPens(mData.away_penalties || 0);
        }

        const { data: pData } = await supabase
          .from('players')
          .select('*')
          .in('team_id', [mData.home_team_id, mData.away_team_id]);
        setPlayers(pData || []);
        await refreshEvents();
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const refreshEvents = async () => {
    const { data: eData } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', id)
      .order('minute', { ascending: true });
    setEvents(eData || []);
  };

  const handleAddEvent = async (pId: string, type: string, min: string, assistId: string) => {
    setSaving(true);
    let finalType = type;

    if (type === 'cartao_amarelo') {
      const existingYellow = events.find(ev => ev.player_id === pId && ev.type === 'cartao_amarelo');
      if (existingYellow) {
        if (confirm('Este jogador já tem um amarelo. Lançar como Expulsão (2º Amarelo)?')) {
          finalType = 'cartao_vermelho_indireto';
        } else {
          setSaving(false);
          return;
        }
      }
    }

    const { error } = await supabase.from('match_events').insert([{
      match_id: id,
      player_id: pId,
      type: finalType,
      minute: min ? parseInt(min) : null,
      assist_player_id: assistId || null
    }]);

    if (!error) {
      await refreshEvents();
    } else {
      alert('Erro ao salvar: ' + error.message);
    }
    setSaving(false);
  };

  const deleteEvent = async (eventId: string) => {
    await supabase.from('match_events').delete().eq('id', eventId);
    refreshEvents();
  };

  // ── FINALIZAR PARTIDA ──
  const handleFinalize = async () => {
    if (match?.status === 'finalizado') {
      if (!confirm('Esta partida já está finalizada. Deseja CORRIGIR o resultado?\n\nAtenção: a classificação será recalculada automaticamente.')) return;
    }

    setSaving(true);
    const isPenaltyTied = match?.phase !== 'grupo' && homeScore === awayScore;
    let winnerId = null;

    if (homeScore > awayScore) winnerId = match?.home_team_id;
    else if (awayScore > homeScore) winnerId = match?.away_team_id;
    else if (isPenaltyTied) {
      if (homePens === awayPens) {
        alert('Pênaltis empatados! Defina um vencedor nos pênaltis.');
        setSaving(false);
        return;
      }
      winnerId = homePens > awayPens ? match?.home_team_id : match?.away_team_id;
    }

    const { error } = await supabase.from('matches').update({
      home_score: homeScore,
      away_score: awayScore,
      home_penalties: isPenaltyTied && (homePens > 0 || awayPens > 0) ? homePens : null,
      away_penalties: isPenaltyTied && (homePens > 0 || awayPens > 0) ? awayPens : null,
      winner_id: winnerId,
      status: 'finalizado'
    }).eq('id', id);

    if (!error) {
      alert('✅ Resultado salvo com sucesso!');
      navigate('/admin/jogos');
    } else {
      alert('Erro ao salvar: ' + error.message);
    }
    setSaving(false);
  };

  // ── RESETAR PARTIDA (dados de teste → agendado, placar zerado) ──
  const handleReset = async () => {
    setResetting(true);
    try {
      // 1. Apaga todos os eventos da partida
      const { error: evError } = await supabase
        .from('match_events')
        .delete()
        .eq('match_id', id);

      if (evError) throw new Error('Erro ao apagar eventos: ' + evError.message);

      // 2. Zera placar e volta status para agendado
      const { error: mError } = await supabase.from('matches').update({
        home_score: null,
        away_score: null,
        home_penalties: null,
        away_penalties: null,
        winner_id: null,
        status: 'agendado'
      }).eq('id', id);

      if (mError) throw new Error('Erro ao resetar partida: ' + mError.message);

      // 3. Recarrega dados
      setHomeScore(0);
      setAwayScore(0);
      setHomePens(0);
      setAwayPens(0);
      setEvents([]);
      await fetchMatch(false);
      setShowResetConfirm(false);
      alert('✅ Partida resetada! Pronto para lançar os dados reais.');
    } catch (err: any) {
      alert('❌ ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading || !match) return (
    <div style={{ textAlign: 'center', padding: '10rem' }}>
      <Loader2 className="animate-spin" />
    </div>
  );

  const showPens = match.phase !== 'grupo' && homeScore === awayScore;
  const isFinished = match.status === 'finalizado';
  const isKnockout = match.phase !== 'grupo';

  return (
    <div className="container animate-fade" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/admin/jogos')} className="btn btn-secondary">
          <ChevronLeft size={18} /> Voltar
        </button>
        <h2 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Gerenciar Partida
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isFinished && (
            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> FINALIZADO
            </span>
          )}
        </div>
      </div>

      {/* Card de placar */}
      <div className="premium-card" style={{ marginBottom: '1.5rem' }}>
        <div className="premium-card-header">
          <div className="section-label-bar">
            <span className="header-main-title">
              {isFinished ? '✏️ Corrigir Resultado' : '⚽ Lançar Resultado'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-subtle)' }}>
            {match.phase === 'grupo' ? `Rodada ${match.round}` : match.phase.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Times + Placar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem' }}>
            <div style={{ textAlign: 'center' }}>
              <img src={match.home_team?.logo_url} style={{ width: 80, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }} />
              <div style={{ fontWeight: 900, marginTop: '0.75rem', fontSize: '1rem', color: 'var(--primary-dark)', textTransform: 'uppercase' }}>{match.home_team?.name}</div>
              <div style={{
                width: '80px', height: '80px', fontSize: '2.5rem', fontWeight: 900, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--primary-dark)', color: '#fff', 
                borderRadius: '14px', marginTop: '1rem', marginInline: 'auto'
              }}>
                {homeScore}
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-subtle)' }}>×</div>

            <div style={{ textAlign: 'center' }}>
              <img src={match.away_team?.logo_url} style={{ width: 80, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }} />
              <div style={{ fontWeight: 900, marginTop: '0.75rem', fontSize: '1rem', color: 'var(--primary-dark)', textTransform: 'uppercase' }}>{match.away_team?.name}</div>
              <div style={{
                width: '80px', height: '80px', fontSize: '2.5rem', fontWeight: 900, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--primary-dark)', color: '#fff', 
                borderRadius: '14px', marginTop: '1rem', marginInline: 'auto'
              }}>
                {awayScore}
              </div>
            </div>
          </div>

          {/* Pênaltis (mata-mata empatado) */}
          {showPens && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(202,138,4,0.08)', borderRadius: '12px', border: '1px solid rgba(202,138,4,0.3)' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: '#b45309', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                🥅 Disputa de Pênaltis
              </h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', alignItems: 'center' }}>
                <div style={{ 
                    width: '80px', height: '70px', fontSize: '2.5rem', fontWeight: 900, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', border: '3px solid #fbbf24',
                    background: '#fff', color: '#b45309',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}>
                  {homePens}
                </div>
                <span style={{ fontWeight: 900, color: '#b45309', fontSize: '1.5rem' }}>×</span>
                <div style={{ 
                    width: '80px', height: '70px', fontSize: '2.5rem', fontWeight: 900, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '12px', border: '3px solid #fbbf24',
                    background: '#fff', color: '#b45309',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}>
                  {awayPens}
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div style={{ display: 'grid', gridTemplateColumns: isFinished ? '1fr 1fr' : '1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
            {/* FINALIZAR / CORRIGIR */}
            <button
              onClick={handleFinalize}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                background: isFinished ? 'var(--secondary-color)' : 'var(--primary-color)',
                color: '#fff', border: 'none', borderRadius: '12px',
                padding: '0.9rem', fontWeight: 800, fontSize: '0.9rem',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isFinished ? 'Corrigir Resultado' : 'Finalizar Partida'}
            </button>

            {/* RESETAR (só aparece se já foi finalizado) */}
            {isFinished && (
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'rgba(220,38,38,0.08)',
                  color: 'var(--error)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  borderRadius: '12px', padding: '0.9rem',
                  fontWeight: 800, fontSize: '0.9rem',
                  cursor: resetting ? 'not-allowed' : 'pointer',
                }}
              >
                <RotateCcw size={18} /> Resetar Partida
              </button>
            )}
          </div>

          {/* Explicação */}
          <p style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-subtle)', textAlign: 'center', lineHeight: 1.5 }}>
            {isFinished
              ? '✏️ <b>Corrigir</b> atualiza o placar existente e recalcula a classificação. <b>Resetar</b> apaga tudo e volta ao estado "agendado".'
              : '✅ <b>Finalizar</b> salva o resultado e atualiza a classificação automaticamente.'}
          </p>
        </div>
      </div>

      {/* Modal de confirmação de reset */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="var(--error)" />
              <h3 style={{ fontWeight: 900, color: 'var(--primary-dark)', margin: 0 }}>Resetar Partida?</h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Isso irá <strong>apagar todos os eventos</strong> (gols, cartões, assistências) e zerar o placar, retornando a partida para o status <strong>Agendado</strong>.<br /><br />
              Use isso para remover dados de teste antes de lançar o resultado real.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                style={{ padding: '0.75rem', borderRadius: '10px', border: 'none', background: 'var(--error)', color: '#fff', fontWeight: 800, cursor: resetting ? 'not-allowed' : 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {resetting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                {resetting ? 'Resetando...' : 'Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lançamento de eventos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h4 style={{ marginBottom: '0.75rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            ⚽ {match.home_team?.name}
          </h4>
          <EventForm players={players.filter(p => p.team_id === match.home_team_id)} onAdd={handleAddEvent} disabled={saving} />
          <div style={{ marginTop: '0.75rem' }}>
            {events.filter(ev => players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id).map(ev => (
              <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
            ))}
          </div>
        </div>
        <div>
          <h4 style={{ marginBottom: '0.75rem', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            ⚽ {match.away_team?.name}
          </h4>
          <EventForm players={players.filter(p => p.team_id === match.away_team_id)} onAdd={handleAddEvent} disabled={saving} />
          <div style={{ marginTop: '0.75rem' }}>
            {events.filter(ev => players.find(p => p.id === ev.player_id)?.team_id === match.away_team_id).map(ev => (
              <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const EventForm = ({ players, onAdd, disabled }: { players: Player[], onAdd: (p: string, t: string, m: string, a: string) => void, disabled: boolean }) => {
  const [pId, setPId] = useState('');
  const [type, setType] = useState('gol');
  const [min, setMin] = useState('');
  const [assistId, setAssistId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pId) return alert('Selecione um jogador (autor)');
    onAdd(pId, type, min, assistId);
    setPId(''); setMin(''); setAssistId('');
  };

  return (
    <form className="premium-card" onSubmit={handleSubmit} style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select value={pId} onChange={e => setPId(e.target.value)} style={{ flex: 2, fontSize: '0.82rem', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <option value="">Autor do Lance...</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={type} onChange={e => { setType(e.target.value); if (e.target.value !== 'gol') setAssistId(''); }} style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <option value="gol">⚽ Gol</option>
          <option value="penalti_convertido">✅ Pênalti Convertido</option>
          <option value="penalti_perdido">❌ Pênalti Perdido</option>
          <option value="cartao_amarelo">🟨 Amarelo</option>
          <option value="cartao_vermelho_direto">🟥 Vermelho Direto</option>
          <option value="cartao_vermelho_indireto">🟥 2º Amarelo</option>
        </select>
      </div>

      {type === 'gol' && (
        <div style={{ marginBottom: '0.5rem' }}>
          <select value={assistId} onChange={e => setAssistId(e.target.value)} style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <option value="">Assistência (Opcional)...</option>
            {players.filter(p => p.id !== pId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input type="number" placeholder="Min" value={min} min={1} onChange={e => setMin(e.target.value)} style={{ flex: 1, fontSize: '0.82rem', padding: '0.4rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
        <button type="submit" disabled={disabled} style={{ flex: 2, padding: '0.4rem 0.75rem', borderRadius: '8px', border: 'none', background: 'var(--primary-dark)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
          {disabled ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Lançar
        </button>
      </div>
    </form>
  );
};

const EventRow = ({ ev, players, onDelete }: { ev: any, players: Player[], onDelete: (id: string) => void }) => {
  const player = players.find(p => p.id === ev.player_id);
  const assistPlayer = players.find(p => p.id === ev.assist_player_id);
  const isGoal = ev.type === 'gol';
  const isYellow = ev.type === 'cartao_amarelo';
  const isRedDirect = ev.type === 'cartao_vermelho_direto';
  const isRedIndirect = ev.type === 'cartao_vermelho_indireto';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', marginBottom: '0.4rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1rem' }}>
          {isGoal && '⚽'}
          {ev.type === 'penalti_convertido' && '✅'}
          {ev.type === 'penalti_perdido' && '❌'}
          {isYellow && '🟨'}
          {(isRedDirect || isRedIndirect) && '🟥'}
        </span>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
            {player?.name}
            {ev.minute && <span style={{ fontWeight: 500, color: 'var(--text-subtle)', marginLeft: '4px' }}>{ev.minute}'</span>}
            {isRedDirect && <span style={{ color: 'var(--error)', fontSize: '0.65rem', fontWeight: 800, marginLeft: '6px' }}>DIRETO</span>}
            {isRedIndirect && <span style={{ color: 'var(--error)', fontSize: '0.65rem', fontWeight: 800, marginLeft: '6px' }}>2º AMARELO</span>}
            {ev.type === 'penalti_convertido' && <span style={{ color: '#059669', fontSize: '0.65rem', fontWeight: 800, marginLeft: '6px' }}>CONVERTIDO</span>}
            {ev.type === 'penalti_perdido' && <span style={{ color: 'var(--error)', fontSize: '0.65rem', fontWeight: 800, marginLeft: '6px' }}>PERDIDO</span>}
          </div>
          {assistPlayer && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '1px' }}>
              🤝 {assistPlayer.name}
            </div>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', padding: '4px' }}>
        <Trash2 size={15} />
      </button>
    </div>
  );
};

export default AdminMatchDetail;
