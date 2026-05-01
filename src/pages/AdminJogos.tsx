import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Match, Stage, STAGE_TYPE_LABELS } from '../types';
import { Plus, Calendar, Edit2, Loader2, Wand2, Trash2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminContext } from '../components/AdminContext';

const AdminJogos = () => {
  const navigate = useNavigate();
  const { activeSeason, loading: ctxLoading } = useAdminContext();
  const [times, setTimes] = useState<Team[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [jogos, setJogos] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  
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

  useEffect(() => {
    if (activeSeason) fetchData();
  }, [activeSeason]);

  const fetchData = async () => {
    if (!activeSeason) return;
    setLoading(true);

    const [stRes, jRes, stagesRes] = await Promise.all([
      supabase.from('season_teams').select('team:teams(*)').eq('season_id', activeSeason.id),
      supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(id, name, type, order_index)').eq('season_id', activeSeason.id).order('date'),
      supabase.from('stages').select('*').eq('season_id', activeSeason.id).order('order_index')
    ]);
    
    if (!stRes.error && stRes.data) {
      setTimes(stRes.data.map(st => st.team as unknown as Team).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)));
    }
    
    const matchesData = jRes.data || [];
    setJogos(matchesData);
    setStages(stagesRes.data || []);
    
    if (stagesRes.data && stagesRes.data.length > 0 && !stageId) {
      setStageId(stagesRes.data[0].id);
    }

    // Auto-suggest round if not editing
    if (!editingId && matchesData.length > 0) {
      const maxRound = Math.max(...matchesData.map(j => j.round || 1));
      setRound(maxRound);
    }
    
    setLoading(false);
  };

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
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (!error) fetchData();
    else alert('Erro ao excluir jogo');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeId || !awayId) return alert('Selecione os dois times');
    if (homeId === awayId) return alert('Os times devem ser diferentes');
    if (!stageId) return alert('Selecione uma fase (stage)');
    
    setSaving(true);
    const matchData = {
      season_id: activeSeason!.id,
      stage_id: stageId,
      round,
      home_team_id: homeId,
      away_team_id: awayId,
      date: date || null,
      time: time || null,
      venue: venue || null,
    };

    if (editingId) {
      const { error } = await supabase.from('matches').update(matchData).eq('id', editingId);
      if (error) alert('Erro ao atualizar jogo');
      else {
        setEditingId(null);
        cancelEdit();
        fetchData();
      }
    } else {
      const { error } = await supabase.from('matches').insert([{
        ...matchData,
        status: 'agendado'
      }]);
      if (error) alert('Erro ao salvar jogo');
      else fetchData();
    }
    setSaving(false);
  };

  // Otimização: Agrupa os jogos por rodada para facilitar a visualização e melhorar a performance
  const jogosPorRodada = jogos.reduce((acc: Record<number, Match[]>, jogo) => {
    if (!acc[jogo.round]) acc[jogo.round] = [];
    acc[jogo.round].push(jogo);
    return acc;
  }, {});

  const roundsSorted = Object.keys(jogosPorRodada).map(Number).sort((a, b) => a - b);

  return (
    <div className="animate-fade" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><Calendar /> Gerenciar Jogos</h1>
      </div>

      <div style={{ padding: '1rem', background: 'var(--primary-light)', border: '1px solid var(--primary-color)', borderRadius: '12px', marginBottom: '2.5rem' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
                {jogosPorRodada[r].map(jogo => (
                  <div 
                    key={jogo.id} 
                    className="card card-hover" 
                    onClick={() => navigate(`/admin/${activeSeason.competition?.slug}/${activeSeason.year}/jogos/${jogo.id}`)} 
                    style={{ cursor: 'pointer', padding: '1.25rem', border: '1px solid var(--border-color)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {(jogo as any).stage?.name || ''}
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={(e) => handleEdit(e, jogo)} style={{ color: 'var(--primary-dark)', background: 'none', padding: '6px' }}>
                          <Edit2 size={16} />
                        </button>
                        <button onClick={(e) => handleDelete(e, jogo.id)} style={{ color: 'var(--error)', background: 'none', padding: '6px' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ flex: 1, textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{jogo.home_team?.name}</div>
                      <div style={{ background: 'var(--brand-dark)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, minWidth: '65px', textAlign: 'center', fontSize: '1rem' }}>
                        {jogo.status === 'finalizado' ? `${jogo.home_score} x ${jogo.away_score}` : 'vs'}
                      </div>
                      <div style={{ flex: 1, textAlign: 'left', fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>{jogo.away_team?.name}</div>
                    </div>
                    
                    <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {jogo.date ? jogo.date.split('-').reverse().join('/') : 'A definir'} {jogo.time ? `• ${jogo.time.slice(0, 5)}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminJogos;
