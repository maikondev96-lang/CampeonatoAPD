import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Match, Player } from '../types';
import { Save, ChevronLeft, Plus, Trash2, Loader2, RotateCcw, CheckCircle2, AlertTriangle, Trophy, Timer } from 'lucide-react';
import { checkAndGenerateNextStages } from '../services/automation';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

export default function AdminMatchDetail() {
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
      invalidateKeys: [['admin-match', id], ['artilharia']],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
    setSaving(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('match_events').delete().eq('id', eventId);
        if (error) throw error;
      },
      invalidateKeys: [['admin-match', id]],
      onSuccess: () => refetch()
    });
  };

  const handleFinalize = async () => {
    if (!data) return;
    setSaving(true);
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { h, a, hp, ap } = scores;
        let winner_id = null;
        if (h > a) winner_id = data.match.home_team_id;
        else if (a > h) winner_id = data.match.away_team_id;
        else if (hp > ap) winner_id = data.match.home_team_id;
        else if (ap > hp) winner_id = data.match.away_team_id;

        const { error } = await supabase.from('matches').update({
          home_score: h,
          away_score: a,
          home_penalties: hp,
          away_penalties: ap,
          winner_id,
          status: 'finalizado'
        }).eq('id', id);

        if (error) throw error;

        // Propagação automática de fases
        await checkAndGenerateNextStages(data.match.season_id);
      },
      invalidateKeys: [['admin-match', id], ['jogos'], ['dashboard'], ['classificacao']],
      onSuccess: () => {
        alert('Súmula finalizada com sucesso!');
        navigate('/admin/jogos');
      },
      onError: (err: any) => alert(err.message)
    });
    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('Deseja resetar todos os dados desta partida?')) return;
    setResetting(true);
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        await supabase.from('match_events').delete().eq('match_id', id);
        await supabase.from('matches').update({
          home_score: null,
          away_score: null,
          home_penalties: null,
          away_penalties: null,
          winner_id: null,
          status: 'agendado'
        }).eq('id', id);
      },
      invalidateKeys: [['admin-match', id]],
      onSuccess: () => {
        refetch();
        setShowResetConfirm(false);
      }
    });
    setResetting(false);
  };

  return (
    <div className="animate-fade container" style={{ maxWidth: '800px' }}>
      <QueryView state={state} data={data} onRetry={refetch}>
        {({ match, events, players }) => (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <button className="btn-icon" onClick={() => navigate(-1)}><ChevronLeft /></button>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>SÚMULA DA PARTIDA</h1>
            </div>

            <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <img src={match.home_team?.logo_url} style={{ width: 64, height: 64, objectFit: 'contain' }} />
                  <div style={{ fontWeight: 900, marginTop: '1rem' }}>{match.home_team?.name}</div>
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 900 }}>{scores.h} × {scores.a}</div>
                <div style={{ flex: 1 }}>
                  <img src={match.away_team?.logo_url} style={{ width: 64, height: 64, objectFit: 'contain' }} />
                  <div style={{ fontWeight: 900, marginTop: '1rem' }}>{match.away_team?.name}</div>
                </div>
              </div>
              {match.phase !== 'grupo' && scores.h === scores.a && (
                <div style={{ marginTop: '1rem', color: 'var(--primary-color)', fontWeight: 900 }}>
                  Pênaltis: {scores.hp} - {scores.ap}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <TeamEvents 
                team={match.home_team} 
                players={players.filter(p => p.team_id === match.home_team_id)} 
                events={events.filter(e => players.find(p => p.id === e.player_id)?.team_id === match.home_team_id)}
                onAdd={handleAddEvent}
                onDelete={handleDeleteEvent}
                saving={saving}
              />
              <TeamEvents 
                team={match.away_team} 
                players={players.filter(p => p.team_id === match.away_team_id)} 
                events={events.filter(e => players.find(p => p.id === e.player_id)?.team_id === match.away_team_id)}
                onAdd={handleAddEvent}
                onDelete={handleDeleteEvent}
                saving={saving}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleFinalize} disabled={saving}>
                <Save size={18} /> Finalizar Súmula
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--error)' }} onClick={handleReset} disabled={resetting}>
                <RotateCcw size={18} /> Resetar
              </button>
            </div>
          </>
        )}
      </QueryView>
    </div>
  );
}

function TeamEvents({ team, players, events, onAdd, onDelete, saving }: any) {
  const [pId, setPId] = useState('');
  const [type, setType] = useState('gol');
  const [min, setMin] = useState('');

  const submit = (e: any) => {
    e.preventDefault();
    if (!pId) return;
    onAdd(pId, type, min, '');
    setPId(''); setMin('');
  };

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={16} color="var(--primary-color)" /> {team?.name}
      </h4>
      <form onSubmit={submit} style={{ display: 'grid', gap: '8px', marginBottom: '1rem' }}>
        <select className="form-input" value={pId} onChange={e => setPId(e.target.value)} required>
          <option value="">Atleta...</option>
          {players.map((p: any) => <option key={p.id} value={p.id}>{p.shirt_number ? `${p.shirt_number} - ` : ''}{p.name}</option>)}
        </select>
        <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
          <option value="gol">⚽ Gol</option>
          <option value="gol_penalti">⚽ Gol Pênalti</option>
          <option value="cartao_amarelo">🟨 Amarelo</option>
          <option value="cartao_vermelho_direto">🟥 Vermelho</option>
          <option value="penalti_convertido">✅ Pên. Convertido</option>
          <option value="penalti_perdido">❌ Pên. Perdido</option>
        </select>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input className="form-input" placeholder="Min" type="number" value={min} onChange={e => setMin(e.target.value)} />
          <button className="btn btn-primary" disabled={saving}><Plus size={16} /></button>
        </div>
      </form>
      <div style={{ display: 'grid', gap: '4px' }}>
        {events.map((e: any) => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px', background: 'var(--bg-color)', borderRadius: '4px', fontSize: '0.8rem' }}>
            <span>{e.type === 'gol' ? '⚽' : e.type === 'cartao_amarelo' ? '🟨' : '🟥'} {players.find((p: any) => p.id === e.player_id)?.name} {e.minute}'</span>
            <button className="btn-icon text-error" onClick={() => onDelete(e.id)}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Shield } from 'lucide-react';
