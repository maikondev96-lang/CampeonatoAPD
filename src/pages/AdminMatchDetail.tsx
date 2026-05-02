import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, Player } from '../types';
import { Save, ChevronLeft, Plus, Trash2, Loader2, RotateCcw, CheckCircle2, AlertTriangle, Trophy, Users, Timer } from 'lucide-react';
import { checkAndGenerateNextStages } from '../services/automation';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

const AdminMatchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 1. DATA LAYER (READ)
  const matchQuery = useQuery({
    queryKey: ['admin-match', id],
    queryFn: async () => {
      const [mRes, eRes] = await Promise.all([
        supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').eq('id', id).single(),
        supabase.from('match_events').select('*').eq('match_id', id).order('minute', { ascending: true })
      ]);

      if (mRes.error) throw mRes.error;
      const match = mRes.data;
      const events = eRes.data || [];

      const { data: players, error: pErr } = await supabase
        .from('players')
        .select('*')
        .in('team_id', [match.home_team_id, match.away_team_id])
        .order('shirt_number', { ascending: true });

      if (pErr) throw pErr;

      return { match: match as Match, events, players: players as Player[] };
    },
    enabled: !!id
  });

  const { state, data, refetch } = useQueryEngine(matchQuery);

  // Placares dinâmicos derivados dos eventos
  const scores = useMemo(() => {
    if (!data) return { h: 0, a: 0, hp: 0, ap: 0 };
    const { match, events, players } = data;
    
    const hScore = events.filter(ev =>
      (ev.type === 'gol' || ev.type === 'gol_penalti') &&
      players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id
    ).length;
    
    const aScore = events.filter(ev =>
      (ev.type === 'gol' || ev.type === 'gol_penalti') &&
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

    return { h: hScore, a: aScore, hp: hPens, ap: aPens };
  }, [data]);

  const handleAddEvent = async (pId: string, type: string, min: string, assistId: string) => {
    setSaving(true);
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('match_events').insert([{
          match_id: id,
          player_id: pId,
          type: type,
          minute: parseInt(min) || 0,
          assist_player_id: assistId || null
        }]);
        if (error) throw error;
      },
      invalidateKeys: [['admin-match', id], ['artilharia'], ['match-detail']],
      onSuccess: () => {
        refetch();
      },
      onError: (err: any) => alert('Erro ao salvar evento: ' + err.message)
    });
    setSaving(false);
  };

    setSaving(false);
  };

  const deleteEvent = async (eventId: string) => {
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('match_events').delete().eq('id', eventId);
        if (error) throw error;
      },
      invalidateKeys: [['jogos'], ['artilharia']],
      onSuccess: () => refreshEvents(),
      onError: (err: any) => alert('Erro ao deletar: ' + err.message)
    });
  };

  // ── FINALIZAR PARTIDA (Admin Engine Layer) ──
  const finalizeMutation = useSafeAdminMutation({
    mutationFn: async () => {
      const isPenaltyTied = match?.phase !== 'grupo' && homeScore === awayScore;
      let winnerId: string | null = null;

      if (homeScore > awayScore) winnerId = match?.home_team_id || null;
      else if (awayScore > homeScore) winnerId = match?.away_team_id || null;
      else if (isPenaltyTied) {
        if (homePens === awayPens) {
          throw new Error('Pênaltis empatados! Defina um vencedor nos pênaltis.');
        }
        winnerId = homePens > awayPens ? (match?.home_team_id || null) : (match?.away_team_id || null);
      }

      const { error } = await supabase.from('matches').update({
        home_score: homeScore,
        away_score: awayScore,
        home_penalties: isPenaltyTied && (homePens > 0 || awayPens > 0) ? homePens : null,
        away_penalties: isPenaltyTied && (homePens > 0 || awayPens > 0) ? awayPens : null,
        winner_id: winnerId,
        status: 'finalizado'
      }).eq('id', id);

      if (error) throw error;

      // Propagação automática para mata-mata ou finais e correções
      let autoPropagated = false;
      if (match?.season_id) {
        const autoRes = await checkAndGenerateNextStages(match.season_id);
        if (autoRes.generated) {
          autoPropagated = true;
        }
      }

      return { autoPropagated };
    },
    invalidateKeys: match?.season_id ? [
      ['jogos', match.season_id],
      ['dashboard', match.season_id],
      ['classificacao', match.season_id],
      ['artilharia', match.season_id]
    ] : [],
    onSuccess: (data) => {
      if (data?.autoPropagated) {
        alert('🎉 Fases seguintes (Mata-Mata ou Finais) foram atualizadas ou geradas automaticamente com base no resultado!');
      }
      alert('✅ Resultado salvo com sucesso!');
      navigate('/admin/jogos');
    },
    onError: (err: any) => {
      alert(err.message || 'Erro desconhecido');
    }
  });

  const handleFinalize = () => {
    if (match?.status === 'finalizado') {
      if (!confirm('Esta partida já está finalizada. Deseja CORRIGIR o resultado?\n\nAtenção: a classificação será recalculada automaticamente.')) return;
    }
    finalizeMutation.mutate();
  };

  // ── RESETAR PARTIDA (dados de teste → agendado, placar zerado) ──
  const handleReset = async () => {
    setResetting(true);

    await AdminEngine.safeMutation({
      mutationFn: async () => {
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

        // 2.1. Limpar propagação via automation se existirem finais já configuradas e essa partida foi resetada
        if (match && match.season_id) {
          await checkAndGenerateNextStages(match.season_id);
        }
      },
      invalidateKeys: match?.season_id ? [
        ['jogos', match.season_id],
        ['dashboard', match.season_id],
        ['classificacao', match.season_id],
        ['artilharia', match.season_id]
      ] : [],
      onSuccess: async () => {
        // 3. Recarrega dados localmente
        setHomeScore(0);
        setAwayScore(0);
        setHomePens(0);
        setAwayPens(0);
        setEvents([]);
        await fetchMatch(false);
        setShowResetConfirm(false);
        alert('✅ Partida resetada! Pronto para lançar os dados reais.');
      },
      onError: (err: any) => {
        alert('❌ ' + err.message);
      }
    });

    setResetting(false);
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
      {/* Header App Style */}
      <div className="admin-header-app" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <button onClick={() => navigate('/admin/jogos')} style={{ background: 'none', border: 'none', color: 'var(--text-main)', padding: '4px', cursor: 'pointer' }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>SÚMULA DA PARTIDA</h1>
            <p className="admin-header-subtitle" style={{ margin: 0, marginTop: '2px' }}>
              {match.phase === 'grupo' ? `Rodada ${match.round}` : (match.phase?.replace('_', ' ').toUpperCase() || 'MATA-MATA')}
            </p>
          </div>
          {isFinished && (
            <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(34,197,94,0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> FINALIZADO
            </span>
          )}
        </div>
      </div>

      {/* Card de placar */}
      {/* Card de placar App Style */}
      <div className="fs-comps-section" style={{ marginBottom: '1.5rem', borderTop: 'none' }}>
        <div style={{ padding: '16px' }}>
          {/* Times + Placar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {match.home_team?.logo_url ? (
                <img src={match.home_team.logo_url} style={{ width: 48, height: 48, objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 48, height: 48, background: 'var(--surface-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
              )}
              <div style={{ fontWeight: 900, marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-dark)', textTransform: 'uppercase', lineHeight: 1.2 }}>{match.home_team?.name}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '45px', height: '55px', fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-dark)', color: '#fff', borderRadius: '8px' }}>
                {homeScore}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-subtle)' }}>×</div>
              <div style={{ width: '45px', height: '55px', fontSize: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-dark)', color: '#fff', borderRadius: '8px' }}>
                {awayScore}
              </div>
            </div>

            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {match.away_team?.logo_url ? (
                <img src={match.away_team.logo_url} style={{ width: 48, height: 48, objectFit: 'contain' }} />
              ) : (
                <div style={{ width: 48, height: 48, background: 'var(--surface-alt)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</div>
              )}
              <div style={{ fontWeight: 900, marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-dark)', textTransform: 'uppercase', lineHeight: 1.2 }}>{match.away_team?.name}</div>
            </div>
          </div>

          {/* Pênaltis (mata-mata empatado) */}
          {showPens && (
            <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(202,138,4,0.05)', borderRadius: '8px', border: '1px solid rgba(202,138,4,0.2)' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '0.75rem', color: '#b45309', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                🥅 Disputa de Pênaltis
              </h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: '50px', height: '50px', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '2px solid #fbbf24', background: 'var(--card-bg)', color: '#b45309' }}>
                  {homePens}
                </div>
                <span style={{ fontWeight: 900, color: '#b45309', fontSize: '1.2rem' }}>×</span>
                <div style={{ width: '50px', height: '50px', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '2px solid #fbbf24', background: '#fff', color: '#b45309' }}>
                  {awayPens}
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div style={{ display: 'grid', gridTemplateColumns: isFinished ? '1fr 1fr' : '1fr', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending || AdminEngine.isMutating}
              className="btn-app-primary"
              style={{ background: isFinished ? 'var(--surface-alt)' : 'var(--primary-color)', color: isFinished ? 'var(--text-main)' : '#fff', border: isFinished ? '1px solid var(--border-color)' : 'none' }}
            >
              {finalizeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isFinished ? 'Corrigir' : 'Finalizar Partida'}
            </button>

            {isFinished && (
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting}
                className="btn-app-primary"
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)', border: 'none' }}
              >
                <RotateCcw size={16} /> Resetar
              </button>
            )}
          </div>
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
      {/* Lançamento de eventos (Grid 2 on Desktop, Flex Column on Mobile) */}
      <div className="grid-2">
        <div className="fs-comps-section">
          <div className="fs-section-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>🏠</span> {match.home_team?.name}
          </div>
          <div style={{ padding: '12px' }}>
            <EventForm players={players.filter(p => p.team_id === match.home_team_id)} onAdd={handleAddEvent} disabled={saving} />
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {events.filter(ev => !ev.type.includes('penalti') && players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id).map(ev => (
                <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
              ))}
              {events.some(ev => ev.type.includes('penalti') && players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id) && (
                <>
                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', textAlign: 'center', borderTop: '1px solid rgba(180,83,9,0.1)', paddingTop: '10px' }}>🥅 Pênaltis</div>
                  {events.filter(ev => ev.type.includes('penalti') && players.find(p => p.id === ev.player_id)?.team_id === match.home_team_id).map(ev => (
                    <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="fs-comps-section">
          <div className="fs-section-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>✈️</span> {match.away_team?.name}
          </div>
          <div style={{ padding: '12px' }}>
            <EventForm players={players.filter(p => p.team_id === match.away_team_id)} onAdd={handleAddEvent} disabled={saving} />
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {events.filter(ev => !ev.type.includes('penalti') && players.find(p => p.id === ev.player_id)?.team_id === match.away_team_id).map(ev => (
                <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
              ))}
              {events.some(ev => ev.type.includes('penalti') && players.find(p => p.id === ev.player_id)?.team_id === match.away_team_id) && (
                <>
                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.7rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', textAlign: 'center', borderTop: '1px solid rgba(180,83,9,0.1)', paddingTop: '10px' }}>🥅 Pênaltis</div>
                  {events.filter(ev => ev.type.includes('penalti') && players.find(p => p.id === ev.player_id)?.team_id === match.away_team_id).map(ev => (
                    <EventRow key={ev.id} ev={ev} players={players} onDelete={deleteEvent} />
                  ))}
                </>
              )}
            </div>
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--surface-alt)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <select value={pId} onChange={e => setPId(e.target.value)} style={{ width: '100%', fontSize: '0.8rem', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <option value="">Autor do Lance...</option>
        {players.map(p => <option key={p.id} value={p.id}>{p.shirt_number ? `${p.shirt_number} - ` : ''}{p.name}</option>)}
      </select>

      <select value={type} onChange={e => { setType(e.target.value); if (e.target.value !== 'gol') setAssistId(''); }} style={{ width: '100%', fontSize: '0.8rem', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <option value="gol">⚽ Gol Normal</option>
        <option value="gol_penalti">⚽ Gol Pênalti</option>
        <option value="penalti_perdido_tempo_normal">❌ Pênalti Perdido</option>
        <option value="cartao_amarelo">🟨 Amarelo</option>
        <option value="cartao_vermelho_direto">🟥 Verm. Direto</option>
        <option value="cartao_vermelho_indireto">🟥 2º Amarelo</option>
        <option value="penalti_convertido">✅ Pênaltis: Gol</option>
        <option value="penalti_perdido">❌ Pênaltis: Fora</option>
      </select>

      {(type === 'gol') && (
        <select value={assistId} onChange={e => setAssistId(e.target.value)} style={{ width: '100%', fontSize: '0.8rem', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <option value="">Assistência (Opcional)...</option>
          {players.filter(p => p.id !== pId).map(p => <option key={p.id} value={p.id}>{p.shirt_number ? `${p.shirt_number} - ` : ''}{p.name}</option>)}
        </select>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="number" placeholder="Min" value={min} min={1} onChange={e => setMin(e.target.value)} style={{ flex: 1, fontSize: '0.8rem', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
        <button type="submit" disabled={disabled} style={{ flex: 2, padding: '8px', borderRadius: '6px', border: 'none', background: 'var(--brand-dark)', color: '#fff', fontWeight: 800, fontSize: '0.8rem', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          {disabled ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Lançar
        </button>
      </div>
    </form>
  );
};

const EventRow = ({ ev, players, onDelete }: { ev: any, players: Player[], onDelete: (id: string) => void }) => {
  const player = players.find(p => p.id === ev.player_id);
  const assistPlayer = players.find(p => p.id === ev.assist_player_id);
  const isGoal = ev.type === 'gol' || ev.type === 'gol_penalti';
  const isYellow = ev.type === 'cartao_amarelo';
  const isRedDirect = ev.type === 'cartao_vermelho_direto';
  const isRedIndirect = ev.type === 'cartao_vermelho_indireto';

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }}>
          {ev.type === 'gol' && '⚽'}
          {ev.type === 'gol_penalti' && '⚽'}
          {ev.type === 'penalti_convertido' && '✅'}
          {ev.type === 'penalti_perdido' && '❌'}
          {ev.type === 'penalti_perdido_tempo_normal' && '❌'}
          {isYellow && '🟨'}
          {(isRedDirect || isRedIndirect) && '🟥'}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            {player?.shirt_number ? `${player.shirt_number} ` : ''}{player?.name}
            {ev.minute && <span style={{ fontWeight: 600, color: 'var(--text-subtle)', marginLeft: '4px' }}>{ev.minute}'</span>}
          </div>
          {(isRedDirect || isRedIndirect || ev.type === 'gol_penalti' || ev.type.includes('perdido') || ev.type === 'penalti_convertido') && (
             <div style={{ fontSize: '0.6rem', fontWeight: 700, color: isRedDirect || isRedIndirect || ev.type.includes('perdido') ? 'var(--error)' : '#059669', marginTop: '2px' }}>
               {isRedDirect && 'VERMELHO DIRETO'}
               {isRedIndirect && '2º AMARELO'}
               {ev.type === 'gol_penalti' && 'PÊNALTI'}
               {ev.type === 'penalti_perdido_tempo_normal' && 'PÊNALTI PERDIDO'}
               {ev.type === 'penalti_convertido' && 'CONVERTIDO'}
               {ev.type === 'penalti_perdido' && 'PERDIDO'}
             </div>
          )}
          {assistPlayer && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-subtle)', marginTop: '2px', fontWeight: 600 }}>
              🤝 {assistPlayer.name}
            </div>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px', opacity: 0.7 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export default AdminMatchDetail;
