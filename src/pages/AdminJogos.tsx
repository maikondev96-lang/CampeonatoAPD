import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Match, Stage, STAGE_TYPE_LABELS } from '../types';
import { Plus, Calendar, Edit2, Loader2, Trash2, Save, X, Shield, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminContext } from '../components/AdminContext';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

export default function AdminJogos() {
  const navigate = useNavigate();
  const { activeSeason, loading: ctxLoading } = useAdminContext();
  
  // Form state
  const [round, setRound] = useState(1);
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [stageId, setStageId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. DATA LAYER (READ)
  const query = useQuery({
    queryKey: ['admin-matches', activeSeason?.id],
    queryFn: async () => {
      if (!activeSeason) return { times: [], matches: [], stagesList: [] };
      const [stRes, jRes, stagesRes] = await Promise.all([
        supabase.from('season_teams').select('team:teams(*)').eq('season_id', activeSeason.id),
        supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(*)').eq('season_id', activeSeason.id).order('date'),
        supabase.from('stages').select('*').eq('season_id', activeSeason.id).order('order_index')
      ]);
      
      if (stRes.error) throw stRes.error;
      if (jRes.error) throw jRes.error;
      if (stagesRes.error) throw stagesRes.error;

      return {
        times: stRes.data.map((st: any) => st.team).filter(Boolean),
        matches: jRes.data || [],
        stagesList: stagesRes.data || []
      };
    },
    enabled: !!activeSeason
  });

  const { state, data, refetch } = useQueryEngine(query, ctxLoading);

  const rounds = useMemo<number[]>(() => {
    if (!data?.matches) return [];
    return [...new Set(data.matches.map((m: any) => m.round))].sort((a: any, b: any) => a - b) as number[];
  }, [data]);

  const matchesByRound = useMemo(() => {
    if (!data?.matches) return {};
    const groups: Record<number, any[]> = {};
    data.matches.forEach((m: any) => {
      if (!groups[m.round]) groups[m.round] = [];
      groups[m.round].push(m);
    });
    return groups;
  }, [data]);

  const handleEdit = (e: React.MouseEvent, jogo: Match) => {
    e.stopPropagation();
    setEditingId(jogo.id);
    setRound(jogo.round);
    setStageId(jogo.stage_id || '');
    setHomeId(jogo.home_team_id);
    setAwayId(jogo.away_team_id);
    setDate(jogo.date || '');
    setTime(jogo.time || '');
    setVenue(jogo.venue || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setHomeId('');
    setAwayId('');
    setDate('');
    setTime('');
    setVenue('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason || !homeId || !awayId) return alert('Selecione os times');
    setSaving(true);
    
    const matchData = {
      season_id: activeSeason.id,
      stage_id: stageId || null,
      round,
      home_team_id: homeId,
      away_team_id: awayId,
      date: date || null,
      time: time || null,
      venue: venue || '',
      status: 'agendado'
    };

    await AdminEngine.safeMutation({
      mutationFn: async () => {
        if (editingId) {
          const { error } = await supabase.from('matches').update(matchData).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('matches').insert([matchData]);
          if (error) throw error;
        }
      },
      invalidateKeys: [['admin-matches'], ['jogos']],
      onSuccess: () => {
        cancelEdit();
        refetch();
      }
    });
    setSaving(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Excluir este jogo?')) return;
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('matches').delete().eq('id', id);
        if (error) throw error;
      },
      invalidateKeys: [['admin-matches']],
      onSuccess: () => refetch()
    });
  };

  return (
    <div className="animate-fade container" style={{ maxWidth: '900px' }}>
      <h1 className="section-title"><Calendar /> Gestão de Tabela</h1>

      <QueryView state={state} data={data} onRetry={refetch}>
        {({ times, stagesList }) => (
          <>
            <form className="card" onSubmit={handleSave} style={{ marginBottom: '2.5rem', border: editingId ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: 900 }}>{editingId ? 'Editar Partida' : 'Nova Partida'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="input-label">Rodada</label>
                  <input className="form-input" type="number" value={round} onChange={e => setRound(parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="input-label">Fase</label>
                  <select className="form-input" value={stageId} onChange={e => setStageId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {stagesList.map((s: any) => <option key={s.id} value={s.id}>{STAGE_TYPE_LABELS[s.type as keyof typeof STAGE_TYPE_LABELS] || s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Data</label>
                  <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="input-label">Hora</label>
                  <input className="form-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="input-label">Time Casa</label>
                  <select className="form-input" value={homeId} onChange={e => setHomeId(e.target.value)} required>
                    <option value="">Selecionar...</option>
                    {times.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Time Fora</label>
                  <select className="form-input" value={awayId} onChange={e => setAwayId(e.target.value)} required>
                    <option value="">Selecionar...</option>
                    {times.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />}
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Jogo'}
                </button>
                {editingId && <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ flex: 1 }}>Cancelar</button>}
              </div>
            </form>

            <div style={{ display: 'grid', gap: '2rem' }}>
              {rounds.map((r: number) => (
                <div key={r}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.8rem', background: 'var(--surface-alt)', padding: '4px 12px', borderRadius: '20px' }}>RODADA {r}</h4>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                  </div>
                  
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {(matchesByRound[r] || []).map((jogo: any) => (
                      <div key={jogo.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/admin/jogos/${jogo.id}`)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                          <div style={{ width: '40px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            <Clock size={14} style={{ marginBottom: '2px' }} />
                            <div>{jogo.time?.slice(0, 5) || '--:--'}</div>
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontWeight: 800, textAlign: 'right', flex: 1 }}>{jogo.home_team?.name}</span>
                            <div style={{ background: 'var(--surface-alt)', padding: '4px 12px', borderRadius: '4px', fontWeight: 900, fontSize: '1.1rem' }}>
                              {jogo.status === 'finalizado' ? `${jogo.home_score} - ${jogo.away_score}` : 'VS'}
                            </div>
                            <span style={{ fontWeight: 800, textAlign: 'left', flex: 1 }}>{jogo.away_team?.name}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '1rem' }}>
                          <button className="btn-icon" onClick={(e) => handleEdit(e, jogo)}><Edit2 size={14} /></button>
                          <button className="btn-icon text-error" onClick={(e) => handleDelete(e, jogo.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </QueryView>
    </div>
  );
}
