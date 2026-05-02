import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Plus, Save, Trash2, Loader2, Edit2, Search, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';
import { useSeasonContext } from '../components/SeasonContext';

export default function AdminJogadores() {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});

  // Form State
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [position, setPosition] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. DATA LAYER
  const query = useQuery({
    queryKey: ['admin-players-data', season?.id],
    queryFn: async () => {
      if (!season) return { times: [], players: [] };
      
      const [teamsRes, playersRes] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('players').select('*, team:teams(*)').order('name')
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (playersRes.error) throw playersRes.error;

      return {
        times: teamsRes.data || [],
        players: playersRes.data || []
      };
    },
    enabled: !!season
  });

  const { state, data, refetch } = useQueryEngine(query, ctxLoading);

  const handleEdit = (player: any) => {
    setEditingId(player.id);
    setName(player.name);
    setTeamId(player.team_id || '');
    setShirtNumber(player.shirt_number?.toString() || '');
    setPosition(player.position || '');
    setPhotoUrl(player.photo_url || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setTeamId('');
    setShirtNumber('');
    setPosition('');
    setPhotoUrl('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !teamId) return alert('Nome e Equipe são obrigatórios');
    setSaving(true);

    const playerData = {
      name,
      team_id: teamId,
      shirt_number: shirtNumber ? parseInt(shirtNumber) : null,
      position: position || null,
      photo_url: photoUrl || null,
      updated_at: new Date().toISOString()
    };

    await AdminEngine.safeMutation({
      mutationFn: async () => {
        if (editingId) {
          const { error } = await supabase.from('players').update(playerData).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('players').insert([playerData]);
          if (error) throw error;
        }
      },
      invalidateKeys: [['admin-players-data'], ['rosters'], ['artilharia']],
      onSuccess: () => {
        cancelEdit();
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este jogador permanentemente?')) return;
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
      },
      invalidateKeys: [['admin-players-data'], ['rosters']],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const filteredPlayers = data?.players.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.team?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const groupedPlayers = data?.times.map((t: any) => ({
    ...t,
    players: filteredPlayers.filter((p: any) => p.team_id === t.id)
  })).filter((t: any) => t.players.length > 0 || searchTerm === '') || [];

  return (
    <div className="animate-fade container" style={{ maxWidth: '900px' }}>
      <h1 className="section-title"><Users /> Gestão de Atletas</h1>

      <QueryView state={state} data={data} onRetry={refetch}>
        {({ times }) => (
          <>
            <form className="card" onSubmit={handleSave} style={{ marginBottom: '2.5rem', border: editingId ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: 900 }}>{editingId ? 'Editar Jogador' : 'Cadastrar Novo Jogador'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="input-label">Nome Completo</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="input-label">Equipe</label>
                  <select className="form-input" value={teamId} onChange={e => setTeamId(e.target.value)} required>
                    <option value="">Selecionar...</option>
                    {times.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Camisa</label>
                  <input className="form-input" type="number" value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="input-label">Posição</label>
                  <select className="form-input" value={position} onChange={e => setPosition(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="GOL">Goleiro</option>
                    <option value="ZAG">Zagueiro</option>
                    <option value="LAT">Lateral</option>
                    <option value="VOL">Volante</option>
                    <option value="MEI">Meio-Campo</option>
                    <option value="ATA">Atacante</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />}
                  {editingId ? 'Atualizar Atleta' : 'Salvar Atleta'}
                </button>
                {editingId && <button type="button" className="btn btn-secondary" onClick={cancelEdit} style={{ flex: 1 }}>Cancelar</button>}
              </div>
            </form>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
                <input className="form-input" style={{ paddingLeft: '3rem' }} placeholder="Buscar por nome ou time..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {groupedPlayers.map((t: any) => (
                <div key={t.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div 
                    onClick={() => toggleTeam(t.id)}
                    style={{ background: 'var(--surface-alt)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Shield size={18} color="var(--primary-color)" />
                      <h4 style={{ margin: 0, fontWeight: 900 }}>{t.name} <span style={{ opacity: 0.5, fontSize: '0.8rem', fontWeight: 500 }}>({t.players.length} atletas)</span></h4>
                    </div>
                    {expandedTeams[t.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>

                  {expandedTeams[t.id] && (
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {t.players.map((j: any) => (
                          <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ width: '24px', fontWeight: 900, color: 'var(--primary-color)' }}>{j.shirt_number || '-'}</span>
                              <div>
                                <div style={{ fontWeight: 800 }}>{j.name}</div>
                                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{j.position || 'N/A'}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="btn-icon" onClick={() => handleEdit(j)}><Edit2 size={16} /></button>
                              <button className="btn-icon text-error" onClick={() => handleDelete(j.id)}><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </QueryView>
    </div>
  );
}
