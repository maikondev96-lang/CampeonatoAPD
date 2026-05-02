import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Match, Stage, STAGE_TYPE_LABELS } from '../types';
import { Plus, Calendar, Edit2, Loader2, Wand2, Trash2, Save, X, Trophy, MapPin, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminContext } from '../components/AdminContext';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

const AdminJogos = () => {
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
      if (!activeSeason) return null;
      const [stRes, jRes, stagesRes] = await Promise.all([
        supabase.from('season_teams').select('team:teams(*)').eq('season_id', activeSeason.id),
        supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(id, name, type, order_index)').eq('season_id', activeSeason.id).order('date'),
        supabase.from('stages').select('*').eq('season_id', activeSeason.id).order('order_index')
      ]);
      
      if (stRes.error) throw stRes.error;
      if (jRes.error) throw jRes.error;
      if (stagesRes.error) throw stagesRes.error;

      const times = stRes.data.map(st => st.team as unknown as Team).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
      const matches = jRes.data || [];
      const stagesList = stagesRes.data || [];

      return { times, matches, stagesList };
    },
    enabled: !!activeSeason
  });

  const { state, data, refetch } = useQueryEngine(query, ctxLoading);

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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este jogo?')) return;
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('matches').delete().eq('id', id);
        if (error) throw error;
      },
      invalidateKeys: [['admin-matches', activeSeason?.id], ['matches']],
      onSuccess: () => refetch(),
      onError: (err: any) => alert('Erro ao excluir jogo: ' + err.message)
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) return;
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
      status: 'pending'
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
      invalidateKeys: [['admin-matches', activeSeason?.id], ['matches']],
      onSuccess: () => {
        cancelEdit();
        refetch();
      }
    });
    setSaving(false);
  };

  const rounds = data ? [...new Set(data.matches.map(m => m.round))].sort((a, b) => a - b) : [];

  return (
    <div className="animate-fade" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="admin-header-app" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-header-title">
          <Calendar size={18} />
          <h1>GERENCIAR JOGOS</h1>
        </div>
        <p className="admin-header-subtitle">Lance resultados e altere os confrontos.</p>
      </div>

      <div style={{ padding: '16px', background: 'var(--primary-light)', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary-dark)', fontWeight: 700 }}>
          🤖 <strong>Automação Ativada:</strong> Os jogos do mata-mata (Semifinais, Final, etc.) serão gerados automaticamente baseados na regra do campeonato assim que todos os jogos da fase de grupos (ou semis) forem finalizados.
        </p>
      </div>
      
      {/* Formulário de Cadastro/Edição */}
      <form className="card" onSubmit={handleSave} style={{ border: editingId ? '2px solid var(--primary-color)' : 'none', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            {editingId ? '📝 Editando Partida' : '➕ Nova Partida'}
          </h3>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem' }}>
              <X size={16} /> Cancelar
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div className="form-group">
            <label>Rodada</label>
            <input type="number" value={round} onChange={e => setRound(parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Fase</label>
            <select value={stageId} onChange={e => setStageId(e.target.value)}>
              <option value="">Selecione...</option>
              {stages.map(s => <option key={s.id} value={s.id}>{STAGE_TYPE_LABELS[s.type] || s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Data <span style={{ fontWeight: 500, color: 'var(--text-subtle)', fontSize: '0.75rem' }}>(opcional — A definir)</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Hora</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Time Casa</label>
            <select value={homeId} onChange={e => setHomeId(e.target.value)}>
              <option value="">Selecione...</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Time Fora</label>
            <select value={awayId} onChange={e => setAwayId(e.target.value)}>
              <option value="">Selecione...</option>
              {times.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', height: '50px', justifyContent: 'center', fontSize: '1rem' }} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus />} 
          {editingId ? 'Salvar Alterações' : 'Criar Partida'}
        </button>
      </form>

      {loading || ctxLoading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>
      ) : !activeSeason ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Nenhuma temporada ativa selecionada.</div>
      ) : (
        <div>
          {roundsSorted.map(r => (
            <div key={r} style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--primary-color)', color: 'black', padding: '2px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem' }}>
                  RODADA {r}
                </div>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              </div>

              <div className="fs-comps-list" style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
                {jogosPorRodada[r].map(jogo => {
                  const isFinished = jogo.status === 'finalizado';
                  const isLive = jogo.status === 'ao_vivo';
                  const homeWin = isFinished && (jogo.home_score || 0) > (jogo.away_score || 0);
                  const awayWin = isFinished && (jogo.away_score || 0) > (jogo.home_score || 0);

                  return (
                    <div 
                      key={jogo.id} 
                      className="fs-match-row"
                      onClick={() => navigate(`/admin/${activeSeason.competition?.slug}/${activeSeason.year}/jogos/${jogo.id}`)} 
                    >
                      <div className="fs-match-time">
                        {isFinished ? (
                          <span className="fs-status finished">Fim</span>
                        ) : isLive ? (
                          <span className="fs-status live">Ao Vivo</span>
                        ) : (
                          <span className="fs-time">{jogo.time?.slice(0, 5) || 'A Def.'}</span>
                        )}
                        {!isFinished && !isLive && <span className="fs-date">{jogo.date?.split('-').reverse().slice(0, 2).join('/')}</span>}
                      </div>

                      <div className="fs-match-teams">
                        <div className="fs-team">
                          {jogo.home_team?.logo_url ? (
                            <img src={jogo.home_team.logo_url} alt="" className="fs-team-logo" />
                          ) : (
                            <div className="fs-team-logo-placeholder">?</div>
                          )}
                          <span className={`fs-team-name ${!jogo.home_team ? 'placeholder' : ''} ${homeWin ? 'winner' : ''}`}>{jogo.home_team?.name || 'A Definir'}</span>
                          <span className={`fs-team-score ${homeWin ? 'winner' : ''}`}>{isFinished || isLive ? jogo.home_score : '-'}</span>
                        </div>
                        <div className="fs-team mt-1">
                          {jogo.away_team?.logo_url ? (
                            <img src={jogo.away_team.logo_url} alt="" className="fs-team-logo" />
                          ) : (
                            <div className="fs-team-logo-placeholder">?</div>
                          )}
                          <span className={`fs-team-name ${!jogo.away_team ? 'placeholder' : ''} ${awayWin ? 'winner' : ''}`}>{jogo.away_team?.name || 'A Definir'}</span>
                          <span className={`fs-team-score ${awayWin ? 'winner' : ''}`}>{isFinished || isLive ? jogo.away_score : '-'}</span>
                        </div>
                      </div>
                      
                      {/* Ações de Edição (Somente visível no Admin) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)', marginLeft: '8px' }}>
                        <button onClick={(e) => handleEdit(e, jogo)} style={{ color: 'var(--primary-dark)', background: 'var(--surface-alt)', border: 'none', padding: '6px', borderRadius: '4px' }}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={(e) => handleDelete(e, jogo.id)} style={{ color: 'var(--error)', background: 'var(--surface-alt)', border: 'none', padding: '6px', borderRadius: '4px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminJogos;
