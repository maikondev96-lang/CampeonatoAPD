import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Match } from '../types';
import { Plus, Calendar, Edit2, Loader2, Wand2, Trash2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminJogos = () => {
  const navigate = useNavigate();
  const [times, setTimes] = useState<Team[]>([]);
  const [jogos, setJogos] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [fasesGeradas, setFasesGeradas] = useState(false);
  const [finaisGeradas, setFinaisGeradas] = useState(false);
  
  // Form state
  const [round, setRound] = useState(1);
  const [homeId, setHomeId] = useState('');
  const [awayId, setAwayId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [phase, setPhase] = useState<'grupo' | 'semifinal' | 'terceiro_lugar' | 'final'>('grupo');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [tRes, jRes, metaRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('matches').select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)').order('round').order('date'),
      supabase.from('tournament_meta').select('*').eq('key', 'fases_geradas').single()
    ]);
    
    if (!tRes.error) setTimes(tRes.data || []);
    if (!jRes.error) setJogos(jRes.data || []);
    
    const metaFases = metaRes.data;
    if (!metaRes.error && metaFases) setFasesGeradas(metaFases.value_bool);
    
    const { data: metaFinais } = await supabase
      .from('tournament_meta')
      .select('*')
      .eq('key', 'finais_geradas')
      .single();
    if (metaFinais) setFinaisGeradas(metaFinais.value_bool);
    
    // Auto-suggest round if not editing
    if (!editingId && jRes.data && jRes.data.length > 0) {
      const maxRound = Math.max(...jRes.data.map(j => j.round));
      setRound(maxRound);
    }
    
    setLoading(false);
  };

  const handleEdit = (e: React.MouseEvent, jogo: Match) => {
    e.stopPropagation();
    setEditingId(jogo.id);
    setRound(jogo.round);
    setPhase(jogo.phase as any);
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
    
    setSaving(true);
    const matchData = {
      round,
      home_team_id: homeId,
      away_team_id: awayId,
      date: date || null,
      time: time || null,
      venue: venue || null,
      phase,
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

  const generateKnockout = async () => {
    if (fasesGeradas) return alert('Fases finais já foram geradas');
    
    const groupMatches = jogos.filter(j => j.phase === 'grupo');
    if (groupMatches.length === 0) return alert('Cadastre os jogos da fase de grupos primeiro');
    if (groupMatches.some(j => j.status !== 'finalizado')) {
      return alert('Finalize todos os jogos da fase de grupos antes de gerar as finais');
    }

    if (!confirm('Deseja gerar as fases finais (Semifinais) com base na classificação atual?')) return;

    const { data: standings, error: sError } = await supabase.from('standings').select('*, teams(*)');
    if (sError || !standings) return alert('Erro ao buscar classificação');

    const sortedStandings = [...standings].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return (a.teams?.name || '').localeCompare(b.teams?.name || '');
    });

    if (sortedStandings.length < 4) return alert('É necessário pelo menos 4 times para as semifinais');

    const top1 = sortedStandings[0].team_id;
    const top2 = sortedStandings[1].team_id;
    const top3 = sortedStandings[2].team_id;
    const top4 = sortedStandings[3].team_id;

    const semis = [
      { home_team_id: top1, away_team_id: top4, phase: 'semifinal', round: 100, date: null, status: 'agendado' },
      { home_team_id: top2, away_team_id: top3, phase: 'semifinal', round: 100, date: null, status: 'agendado' }
    ];

    const { error: iError } = await supabase.from('matches').insert(semis);
    if (iError) return alert('Erro ao gerar semifinais');

    await supabase.from('tournament_meta').update({ value_bool: true }).eq('key', 'fases_geradas');
    alert('Semifinais geradas com sucesso! Finalize-as para depois gerar o 3º Lugar e a Grande Final.');
    fetchData();
  };

  const generateFinais = async () => {
    if (finaisGeradas) return alert('3º Lugar e Grande Final já foram gerados!');
    if (!fasesGeradas) return alert('Gere as Semifinais primeiro.');

    // Busca as semifinais finalizadas com vencedores
    const { data: semis, error: sErr } = await supabase
      .from('matches')
      .select('*')
      .eq('phase', 'semifinal')
      .eq('status', 'finalizado');

    if (sErr || !semis || semis.length < 2) {
      return alert('As duas Semifinais precisam estar finalizadas com resultado antes de gerar as finais.');
    }

    const semi1 = semis[0];
    const semi2 = semis[1];

    if (!semi1.winner_id || !semi2.winner_id) {
      return alert('Defina o vencedor (resultado final) em ambas as Semifinais antes de gerar as finais.');
    }

    // Vencedores → Grande Final
    const winner1 = semi1.winner_id;
    const winner2 = semi2.winner_id;

    // Perdedores → 3º Lugar
    const loser1 = semi1.home_team_id === winner1 ? semi1.away_team_id : semi1.home_team_id;
    const loser2 = semi2.home_team_id === winner2 ? semi2.away_team_id : semi2.home_team_id;

    const novasPartidas = [
      { home_team_id: loser1, away_team_id: loser2, phase: 'terceiro_lugar', round: 200, date: null, status: 'agendado' },
      { home_team_id: winner1, away_team_id: winner2, phase: 'final', round: 201, date: null, status: 'agendado' },
    ];

    const { error: iErr } = await supabase.from('matches').insert(novasPartidas);
    if (iErr) return alert('Erro ao gerar finais: ' + iErr.message);

    await supabase.from('tournament_meta').update({ value_bool: true }).eq('key', 'finais_geradas');
    alert('✅ 3º Lugar e Grande Final gerados com sucesso!');
    fetchData();
  };

  // ... (states remain same)

  // Otimização: Agrupa os jogos por rodada para facilitar a visualização e melhorar a performance
  const jogosPorRodada = jogos.reduce((acc: Record<number, Match[]>, jogo) => {
    if (!acc[jogo.round]) acc[jogo.round] = [];
    acc[jogo.round].push(jogo);
    return acc;
  }, {});

  const roundsSorted = Object.keys(jogosPorRodada).map(Number).sort((a, b) => a - b);

  return (
    <div className="animate-fade" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><Calendar /> Gerenciar Jogos</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={generateKnockout}
            className="btn btn-secondary"
            style={{ 
              borderColor: fasesGeradas ? 'var(--border-color)' : 'var(--primary-color)', 
              color: fasesGeradas ? 'var(--text-muted)' : 'var(--primary-color)', 
              opacity: fasesGeradas ? 0.5 : 1,
              background: 'white',
              border: '1px solid #e2e8f0'
            }}
            disabled={fasesGeradas}
          >
            <Wand2 size={18} /> Semis
          </button>
          <button
            onClick={generateFinais}
            className="btn btn-secondary"
            style={{ 
              borderColor: finaisGeradas ? 'var(--border-color)' : '#b89112', 
              color: finaisGeradas ? 'var(--text-muted)' : '#b89112', 
              opacity: finaisGeradas ? 0.5 : 1,
              background: 'white',
              border: '1px solid #e2e8f0'
            }}
            disabled={finaisGeradas}
          >
            <Wand2 size={18} /> Finais 🏆
          </button>
        </div>
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
            <select value={phase} onChange={e => setPhase(e.target.value as any)}>
              <option value="grupo">Fase de Grupos</option>
              <option value="semifinal">Semifinal</option>
              <option value="terceiro_lugar">3º Lugar</option>
              <option value="final">Final</option>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>
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
                    onClick={() => navigate(`/admin/jogos/${jogo.id}`)} 
                    style={{ cursor: 'pointer', padding: '1.25rem', border: '1px solid #edf2f7' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{jogo.phase}</span>
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
                      <div style={{ background: 'var(--primary-dark)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontWeight: 900, minWidth: '65px', textAlign: 'center', fontSize: '1rem' }}>
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
