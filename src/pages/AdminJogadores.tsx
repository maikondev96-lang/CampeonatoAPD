import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Player } from '../types';
import { Plus, Users, Trash2, Loader2, Edit2, Save, ChevronDown, ChevronUp, Search } from 'lucide-react';

const AdminJogadores = () => {
  const [times, setTimes] = useState<Team[]>([]);
  const [jogadores, setJogadores] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [tRes, jRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('players').select('*, teams(name)').order('name')
    ]);
    
    if (!tRes.error) setTimes(tRes.data || []);
    if (!jRes.error) setJogadores(jRes.data || []);
    setLoading(false);
  };

  const handleEdit = (e: React.MouseEvent, j: Player) => {
    e.stopPropagation();
    setEditingId(j.id);
    setName(j.name);
    setTeamId(j.team_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setTeamId('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !teamId) return alert('Preencha o nome e selecione o time');
    
    setSaving(true);
    
    if (editingId) {
      const { error } = await supabase.from('players').update({ name, team_id: teamId }).eq('id', editingId);
      if (error) alert('Erro ao atualizar jogador');
      else {
        setEditingId(null);
        setName('');
        setTeamId('');
        fetchData();
      }
    } else {
      const { error } = await supabase.from('players').insert([{ name, team_id: teamId }]);
      if (error) alert('Erro ao salvar jogador');
      else {
        setName('');
        fetchData();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este jogador?')) return;
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (!error) fetchData();
  };

  // Group players by team
  const groupedPlayers = times.map(time => ({
    ...time,
    players: jogadores.filter(j => j.team_id === time.id)
  })).filter(t => 
    searchTerm === '' || 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.players.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="section-title"><Users /> Gerenciar Jogadores</h1>
      
      {/* Formulário */}
      <form className="card" onSubmit={handleSave} style={{ marginBottom: '3rem', border: editingId ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 950, color: 'var(--primary-dark)' }}>
          {editingId ? '📝 Editar Jogador' : '➕ Novo Jogador'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Nome do Jogador</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pelé" />
          </div>
          <div className="form-group">
            <label>Time</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)}>
              <option value="">Selecione um time</option>
              {times.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', height: '48px' }} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus />} 
            {editingId ? 'Atualizar Jogador' : 'Adicionar Jogador'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          )}
        </div>
      </form>

      {/* Busca */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
        <input 
          type="text" 
          placeholder="Buscar por time ou jogador..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', borderRadius: '12px', border: '2px solid var(--border-color)', fontWeight: 700 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupedPlayers.map(time => (
            <div key={time.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setExpandedTeamId(expandedTeamId === time.id ? null : time.id)}
                style={{ 
                  width: '100%', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', 
                  alignItems: 'center', background: 'white', border: 'none', cursor: 'pointer' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img src={time.logo_url} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 950, color: 'var(--primary-dark)', fontSize: '1.1rem' }}>{time.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>{time.players.length} JOGADORES</div>
                  </div>
                </div>
                {expandedTeamId === time.id ? <ChevronUp size={24} color="var(--text-muted)" /> : <ChevronDown size={24} color="var(--text-muted)" />}
              </button>

              {expandedTeamId === time.id && (
                <div style={{ padding: '0.5rem 1.5rem 1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    {time.players.length === 0 ? (
                      <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Nenhum jogador neste time</p>
                    ) : (
                      time.players.map(j => (
                        <div key={j.id} style={{ 
                          background: 'white', padding: '0.75rem 1rem', borderRadius: '10px', 
                          border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                        }}>
                          <span style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{j.name}</span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button onClick={(e) => handleEdit(e, j)} style={{ color: 'var(--primary-dark)', background: 'none', padding: '6px' }}>
                              <Edit2 size={16} />
                            </button>
                            <button onClick={(e) => handleDelete(e, j.id)} style={{ color: 'var(--error)', background: 'none', padding: '6px' }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {groupedPlayers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontWeight: 700 }}>Nenhum time ou jogador encontrado</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminJogadores;
