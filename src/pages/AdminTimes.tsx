import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Plus, Save, Trash2, Loader2, Edit2, Search, Link as LinkIcon, RefreshCw, CheckCircle, Unlock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';
import { useSeasonContext } from '../components/SeasonContext';

export default function AdminTimes() {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. DATA LAYER
  const query = useQuery({
    queryKey: ['admin-teams', season?.id],
    queryFn: async () => {
      if (!season) return [];
      const { data, error } = await supabase
        .from('season_teams')
        .select('*, team:teams(*), players:players(*)')
        .eq('season_id', season.id);
      
      if (error) throw error;
      return (data || []).map(st => ({
        ...st.team,
        season_team_id: st.id,
        roster_status: st.roster_status,
        invite_token: st.invite_token,
        players: st.players || []
      })).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!season
  });

  const { state, data: times, refetch } = useQueryEngine(query, ctxLoading);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !season) return;
    setSaving(true);

    await AdminEngine.safeMutation({
      mutationFn: async () => {
        if (editingId) {
          const { error } = await supabase.from('teams').update({ name, short_name: shortName }).eq('id', editingId);
          if (error) throw error;
        } else {
          // 1. Criar Time
          const { data: newTeam, error: teamErr } = await supabase.from('teams').insert([{ name, short_name: shortName }]).select().single();
          if (teamErr) throw teamErr;
          
          // 2. Vincular à temporada
          const { error: linkErr } = await supabase.from('season_teams').insert([{ season_id: season.id, team_id: newTeam.id, roster_status: 'pendente' }]);
          if (linkErr) throw linkErr;
        }
      },
      invalidateKeys: [['admin-teams'], ['rosters']],
      onSuccess: () => {
        setEditingId(null);
        setName('');
        setShortName('');
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este time da temporada? (O time continuará existindo no banco, mas sairá deste campeonato)')) return;
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('season_teams').delete().eq('team_id', id).eq('season_id', season?.id);
        if (error) throw error;
      },
      invalidateKeys: [['admin-teams']],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
  };

  const handleStatusChange = async (seasonTeamId: string, status: 'pendente' | 'aprovado' | 'finalizado') => {
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('season_teams').update({ roster_status: status }).eq('id', seasonTeamId);
        if (error) throw error;
      },
      invalidateKeys: [['admin-teams']],
      onSuccess: () => refetch()
    });
  };

  const generateInvite = async (seasonTeamId: string) => {
    const token = Math.random().toString(36).substring(2, 15);
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('season_teams').update({ invite_token: token }).eq('id', seasonTeamId);
        if (error) throw error;
      },
      invalidateKeys: [['admin-teams']],
      onSuccess: () => refetch()
    });
  };

  const filteredTimes = times?.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return (
    <div className="animate-fade container" style={{ maxWidth: '900px' }}>
      <h1 className="section-title"><Shield /> Gestão de Equipes</h1>

      <QueryView state={state} data={times} onRetry={refetch}>
        {(timesData) => (
          <>
            <form className="card" onSubmit={handleSave} style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontWeight: 900 }}>{editingId ? 'Editar Equipe' : 'Nova Equipe'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="input-label">Nome da Equipe</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Ajax FC" />
                </div>
                <div className="form-group">
                  <label className="input-label">Sigla (3 letras)</label>
                  <input className="form-input" value={shortName} onChange={e => setShortName(e.target.value.toUpperCase())} maxLength={3} placeholder="Ex: AJX" />
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                  {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />}
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
                {editingId && <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setName(''); setShortName(''); }} style={{ flex: 1 }}>Cancelar</button>}
              </div>
            </form>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={18} />
                <input className="form-input" style={{ paddingLeft: '3rem' }} placeholder="Buscar equipe..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {filteredTimes.map(t => (
                <div key={t.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--surface-alt)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Shield size={20} color="var(--primary-color)" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 900 }}>{t.name}</h4>
                      <div style={{ fontSize: '0.7rem', display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <span style={{ color: t.roster_status === 'aprovado' ? '#22c55e' : 'var(--text-muted)' }}>● {t.roster_status?.toUpperCase()}</span>
                        <span style={{ color: 'var(--text-muted)' }}>● {t.players?.length || 0} atletas</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {t.invite_token ? (
                      <button className="btn-icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/team/${t.invite_token}`); alert('Link copiado!'); }} title="Copiar Link de Convite">
                        <LinkIcon size={16} />
                      </button>
                    ) : (
                      <button className="btn-icon" onClick={() => generateInvite(t.season_team_id)} title="Gerar Link">
                        <RefreshCw size={16} />
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => { setEditingId(t.id); setName(t.name); setShortName(t.short_name || ''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Edit2 size={16} /></button>
                    <button className="btn-icon text-error" onClick={() => handleDelete(t.id)}><Trash2 size={16} /></button>
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
