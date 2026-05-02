import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { History as HistoryIcon, Plus, Save, Trash2, Loader2, Edit, AlertCircle, Trophy, Star, Clock, Image as ImageIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

export default function AdminHistory() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'champions'>('timeline');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    year: '',
    title: '',
    description: '',
    icon_name: 'HistoryIcon',
    color: 'var(--primary-color)',
    competition_name: '',
    champion_name: '',
    champion_logo_url: '',
    runner_up_name: '',
    runner_up_logo_url: '',
    squad_photo_url: ''
  });

  // 1. DATA LAYER (READ)
  const query = useQuery({
    queryKey: ['admin-history', activeTab],
    queryFn: async () => {
      const table = activeTab === 'timeline' ? 'history_timeline' : 'hall_of_fame';
      const { data, error } = await supabase.from(table).select('*').order('year', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { state, data, refetch } = useQueryEngine(query);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      year: '', title: '', description: '', icon_name: 'HistoryIcon', color: 'var(--primary-color)',
      competition_name: '', champion_name: '', champion_logo_url: '', runner_up_name: '', runner_up_logo_url: '',
      squad_photo_url: ''
    });
  };

  const handleSave = async () => {
    const table = activeTab === 'timeline' ? 'history_timeline' : 'hall_of_fame';
    const dataToSave = activeTab === 'timeline' 
      ? { year: formData.year, title: formData.title, description: formData.description, icon_name: formData.icon_name, color: formData.color }
      : { 
          year: formData.year, 
          competition_name: formData.competition_name, 
          champion_name: formData.champion_name, 
          champion_logo_url: formData.champion_logo_url, 
          runner_up_name: formData.runner_up_name, 
          runner_up_logo_url: formData.runner_up_logo_url,
          squad_photo_url: formData.squad_photo_url
        };

    await AdminEngine.safeMutation({
      mutationFn: async () => {
        if (editingId) {
          const { error } = await supabase.from(table).update(dataToSave).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from(table).insert([dataToSave]);
          if (error) throw error;
        }
      },
      invalidateKeys: [['admin-history'], ['history-public']],
      onSuccess: () => {
        alert('Salvo com sucesso!');
        resetForm();
        refetch();
      },
      onError: (err: any) => alert('Erro ao salvar: ' + err.message)
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este item permanentemente?')) return;
    const table = activeTab === 'timeline' ? 'history_timeline' : 'hall_of_fame';
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      },
      invalidateKeys: [['admin-history']],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
  };

  return (
    <div className="animate-fade container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><HistoryIcon /> Gestão Institucional</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
           <button className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('timeline'); resetForm(); }}>
             <Clock size={18} /> Linha do Tempo
           </button>
           <button className={`btn ${activeTab === 'champions' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('champions'); resetForm(); }}>
             <Trophy size={18} /> Hall da Fama
           </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 900 }}>{editingId ? 'Editar Item' : 'Novo Item'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
           <div className="form-group">
             <label className="input-label">Ano</label>
             <input className="form-input" type="number" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="Ex: 2026" />
           </div>
           
           {activeTab === 'timeline' ? (
             <>
               <div className="form-group" style={{ gridColumn: 'span 2' }}>
                 <label className="input-label">Título do Evento</label>
                 <input className="form-input" type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Fundação da Liga" />
               </div>
               <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                 <label className="input-label">Descrição</label>
                 <textarea className="form-input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
               </div>
             </>
           ) : (
             <>
               <div className="form-group" style={{ gridColumn: 'span 2' }}>
                 <label className="input-label">Nome da Competição</label>
                 <input className="form-input" type="text" value={formData.competition_name} onChange={e => setFormData({...formData, competition_name: e.target.value})} />
               </div>
               <div className="form-group">
                 <label className="input-label">Campeão</label>
                 <input className="form-input" type="text" value={formData.champion_name} onChange={e => setFormData({...formData, champion_name: e.target.value})} />
               </div>
               <div className="form-group">
                 <label className="input-label">Vice-Campeão</label>
                 <input className="form-input" type="text" value={formData.runner_up_name} onChange={e => setFormData({...formData, runner_up_name: e.target.value})} />
               </div>
               <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                 <label className="input-label">URL Foto do Elenco (Opcional)</label>
                 <input className="form-input" type="text" value={formData.squad_photo_url} onChange={e => setFormData({...formData, squad_photo_url: e.target.value})} />
               </div>
             </>
           )}
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
           <button className="btn btn-primary" onClick={handleSave}>
             <Save size={18} /> Salvar Alterações
           </button>
           {editingId && <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>}
        </div>
      </div>
      <QueryView state={state} data={data} onRetry={refetch}>
        {(items) => (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {items.map((item: any) => (
              <div key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '60px', height: '60px', background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, fontSize: '1.2rem', color: 'var(--primary-color)' }}>
                    {item.year}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1rem' }}>
                      {activeTab === 'timeline' ? item.title : item.competition_name}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {activeTab === 'timeline' ? item.description : `🏆 Campeão: ${item.champion_name}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(item.id); setFormData({...item}); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <Edit size={16} />
                  </button>
                  <button className="btn btn-secondary btn-sm text-error" onClick={() => handleDelete(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div style={{ padding: '4rem', textAlign: 'center', background: 'var(--surface-alt)', borderRadius: '15px', border: '1px dashed var(--border-color)' }}>
                <HistoryIcon size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Nenhum registro encontrado nesta categoria.</p>
              </div>
            )}
          </div>
        )}
      </QueryView>
    </div>
  );
}
