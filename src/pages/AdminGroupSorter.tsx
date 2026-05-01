import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAdminContext } from '../components/AdminContext';
import { 
  Loader2, Shuffle, Save, Trash2, 
  Users, LayoutGrid, CheckCircle, AlertCircle 
} from 'lucide-react';

export default function AdminGroupSorter() {
  const { activeSeason, loading: ctxLoading } = useAdminContext();
  const [teams, setTeams] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [groupCount, setGroupCount] = useState(4);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeSeason) fetchTeams();
  }, [activeSeason]);

  const fetchTeams = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('season_teams')
      .select('id, group_name, team:teams(id, name)')
      .eq('season_id', activeSeason?.id);
    
    if (data) {
      setTeams(data);
      // Reconstruir grupos existentes
      const existing: Record<string, any[]> = {};
      data.forEach(t => {
        if (t.group_name) {
          if (!existing[t.group_name]) existing[t.group_name] = [];
          existing[t.group_name].push(t);
        }
      });
      setGroups(existing);
    }
    setLoading(false);
  };

  const handleShuffle = () => {
    const unassigned = teams.filter(t => !t.group_name);
    if (unassigned.length === 0) {
      if (!window.confirm('Todos os times já têm grupo. Deseja sortear novamente do zero?')) return;
    }

    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const newGroups: Record<string, any[]> = {};
    
    for (let i = 0; i < groupCount; i++) {
       newGroups[`Grupo ${String.fromCharCode(65 + i)}`] = [];
    }

    shuffled.forEach((team, index) => {
       const groupIndex = index % groupCount;
       const groupName = `Grupo ${String.fromCharCode(65 + groupIndex)}`;
       newGroups[groupName].push(team);
    });

    setGroups(newGroups);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];
      for (const groupName in groups) {
        for (const team of groups[groupName]) {
          updates.push({
            id: team.id,
            group_name: groupName
          });
        }
      }

      for (const update of updates) {
        await supabase.from('season_teams').update({ group_name: update.group_name }).eq('id', update.id);
      }

      alert('Sorteio salvo com sucesso!');
      fetchTeams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading || loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title"><Shuffle /> SORTEIO DE GRUPOS</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-alt)', padding: '4px 12px', borderRadius: '8px' }}>
             <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>GRUPOS:</label>
             <input type="number" value={groupCount} onChange={e => setGroupCount(parseInt(e.target.value))} style={{ width: '50px', padding: '4px', border: 'none', background: 'transparent', fontWeight: 900 }} />
          </div>
          <button className="btn btn-secondary" onClick={handleShuffle} style={{ background: 'var(--brand-dark)', color: 'var(--primary-color)' }}>
            <Shuffle size={18} /> Sortear Agora
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || Object.keys(groups).length === 0}>
            {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Salvar Definições
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {Object.entries(groups).map(([name, members]) => (
          <div key={name} className="premium-card" style={{ padding: '1.5rem' }}>
             <h3 style={{ fontWeight: 950, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                {name}
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{members.length} TIMES</span>
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {members.map(m => (
                   <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface-alt)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{m.team.name}</span>
                   </div>
                ))}
             </div>
          </div>
        ))}

        {teams.some(t => !t.group_name && !Object.values(groups).flat().some(gm => gm.id === t.id)) && (
           <div className="premium-card" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.05)', borderStyle: 'dashed' }}>
              <h3 style={{ fontWeight: 950, marginBottom: '1rem', color: 'var(--text-muted)' }}>Times Sem Grupo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 {teams.filter(t => !t.group_name && !Object.values(groups).flat().some(gm => gm.id === t.id)).map(m => (
                    <div key={m.id} style={{ padding: '10px', background: 'var(--card-bg)', borderRadius: '8px', fontSize: '0.85rem' }}>
                       {m.team.name}
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>

      {!teams.length && (
         <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
            <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
            <p>Nenhum time aprovado para esta temporada ainda.</p>
         </div>
      )}
    </div>
  );
}
