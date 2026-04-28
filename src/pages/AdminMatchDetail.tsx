import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, MatchEvent, Player } from '../types';
import { Save, ChevronLeft, Plus, Trash2, Loader2 } from 'lucide-react';

const AdminMatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Score state
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [homePens, setHomePens] = useState<number>(0);
  const [awayPens, setAwayPens] = useState<number>(0);

  useEffect(() => {
    if (id) fetchMatch(true);
  }, [id]);

  // Cálculo automático de placar baseado nos eventos de gol
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
      
      setHomeScore(hScore);
      setAwayScore(aScore);
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
    // Busca simples de eventos
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

    // Lógica Inteligente de Cartões: detecta 2º amarelo
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

  const handleFinalize = async () => {
    setSaving(true);
    
    const isPenaltyTied = match?.phase !== 'grupo' && homeScore === awayScore;

    let winnerId = null;
    if (homeScore > awayScore) winnerId = match?.home_team_id;
    else if (awayScore > homeScore) winnerId = match?.away_team_id;
    else if (isPenaltyTied) {
      // Empate no tempo normal em jogo eliminatório → decide por pênaltis
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
      // Só salva pênaltis se o jogo realmente foi definido nos pênaltis
      home_penalties: isPenaltyTied && (homePens > 0 || awayPens > 0) ? homePens : null,
      away_penalties: isPenaltyTied && (homePens > 0 || awayPens > 0) ? awayPens : null,
      winner_id: winnerId,
      status: 'finalizado'
    }).eq('id', id);

    if (!error) {
      alert('Resultado Final Salvo!');
      navigate('/admin/jogos');
    } else {
      alert('Erro ao salvar: ' + error.message);
    }
    setSaving(false);
  };

  if (loading || !match) return <div style={{ textAlign: 'center', padding: '10rem' }}><Loader2 className="animate-spin" /></div>;

  const showPens = match.phase !== 'grupo' && homeScore === awayScore;

  return (
    <div className="container animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/admin/jogos')} className="btn btn-secondary"><ChevronLeft size={18} /> Voltar</button>
        <h2 style={{ fontWeight: 800 }}>GERENCIAR PARTIDA</h2>
        <div style={{ width: '80px' }}></div>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem', padding: '1rem 0' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <img src={match.home_team?.logo_url} style={{ width: 100, height: 100, objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }} />
            <div style={{ fontWeight: 950, margin: '1.5rem 0', fontSize: '1.25rem', color: 'var(--primary-dark)', textTransform: 'uppercase' }}>{match.home_team?.name}</div>
            <input 
              type="number" 
              value={homeScore} 
              onChange={e => setHomeScore(parseInt(e.target.value) || 0)} 
              className="score-box" 
              style={{ width: '90px', height: '90px', fontSize: '2.5rem', textAlign: 'center', background: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '16px' }} 
            />
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 950, opacity: 0.1, color: 'var(--primary-dark)' }}>VS</div>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <img src={match.away_team?.logo_url} style={{ width: 100, height: 100, objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }} />
            <div style={{ fontWeight: 950, margin: '1.5rem 0', fontSize: '1.25rem', color: 'var(--primary-dark)', textTransform: 'uppercase' }}>{match.away_team?.name}</div>
            <input 
              type="number" 
              value={awayScore} 
              onChange={e => setAwayScore(parseInt(e.target.value) || 0)} 
              className="score-box" 
              style={{ width: '90px', height: '90px', fontSize: '2.5rem', textAlign: 'center', background: 'var(--primary-dark)', color: '#fff', border: 'none', borderRadius: '16px' }} 
            />
          </div>
        </div>

        {showPens && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,145,0,0.05)', borderRadius: '12px', border: '1px solid #ff9100' }}>
            <h4 style={{ textAlign: 'center', marginBottom: '1rem', color: '#ff9100' }}>DISPUTA DE PÊNALTIS</h4>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', alignItems: 'center' }}>
              <input type="number" value={homePens} onChange={e => setHomePens(parseInt(e.target.value) || 0)} className="score-box" style={{ width: '60px', height: '50px' }} />
              <span style={{ fontWeight: 900 }}>X</span>
              <input type="number" value={awayPens} onChange={e => setAwayPens(parseInt(e.target.value) || 0)} className="score-box" style={{ width: '60px', height: '50px' }} />
            </div>
          </div>
        )}

        <button onClick={handleFinalize} className="btn btn-primary" style={{ width: '100%', height: '64px', marginTop: '2rem', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 950 }} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} FINALIZAR PARTIDA
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h4 style={{ marginBottom: '1rem' }}>Lançar: {match.home_team?.name}</h4>
          <EventForm players={players.filter(p => p.team_id === match.home_team_id)} onAdd={handleAddEvent} disabled={saving} />
          <div style={{ marginTop: '1rem' }}>
            {events.filter(ev => players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id).map(ev => (
              <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
            ))}
          </div>
        </div>
        <div>
          <h4 style={{ marginBottom: '1rem' }}>Lançar: {match.away_team?.name}</h4>
          <EventForm players={players.filter(p => p.team_id === match.away_team_id)} onAdd={handleAddEvent} disabled={saving} />
          <div style={{ marginTop: '1rem' }}>
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
    <form className="card" onSubmit={handleSubmit} style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <select value={pId} onChange={e => setPId(e.target.value)} style={{ flex: 2 }}>
          <option value="">Autor do Lance...</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={type} onChange={e => {
          setType(e.target.value);
          if (e.target.value !== 'gol') setAssistId('');
        }} style={{ flex: 1 }}>
          <option value="gol">Gol ⚽</option>
          <option value="cartao_amarelo">🟨 Amarelo</option>
          <option value="cartao_vermelho_direto">🟥 Vermelho Direto</option>
          <option value="cartao_vermelho_indireto">🟥 2º Amarelo (Expulso)</option>
        </select>
      </div>
      
      {type === 'gol' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <select value={assistId} onChange={e => setAssistId(e.target.value)} style={{ flex: 1 }}>
            <option value="">Assistência (Opcional)...</option>
            {players.filter(p => p.id !== pId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input type="number" placeholder="Min" value={min} onChange={e => setMin(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} disabled={disabled}>Lançar</button>
      </div>
    </form>
  );
};

const EventRow = ({ ev, players, onDelete }: { ev: any, players: Player[], onDelete: (id: string) => void }) => {
  const player = players.find(p => p.id === ev.player_id);
  const assistPlayer = players.find(p => p.id === ev.assist_player_id);
  const isRedDirect = ev.type === 'cartao_vermelho_direto';
  const isRedIndirect = ev.type === 'cartao_vermelho_indireto';
  const isRed = isRedDirect || isRedIndirect;
  const isYellow = ev.type === 'cartao_amarelo';
  const isGoal = ev.type === 'gol';

  return (
    <div className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>
          {isGoal && '⚽'}
          {isYellow && '🟨'}
          {isRed && '🟥'}
        </span>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
          {player?.name} {ev.minute && <span style={{ opacity: 0.5 }}>({ev.minute}')</span>}
          {isRedDirect && <span style={{ color: '#ff5252', fontSize: '0.7rem', marginLeft: '5px' }}>VERMELHO DIRETO</span>}
          {isRedIndirect && <span style={{ color: '#ff5252', fontSize: '0.7rem', marginLeft: '5px' }}>2º AMARELO (EXPULSO)</span>}
          {assistPlayer && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '2px' }}>
              🤝 Assist: {assistPlayer.name}
            </div>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default AdminMatchDetail;
