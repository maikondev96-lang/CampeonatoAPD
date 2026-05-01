import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { History as HistoryIcon, Plus, Save, Trash2, Loader2, Edit, AlertCircle, Trophy, Star, Clock } from 'lucide-react';

export default function AdminHistory() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'champions'>('timeline');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<any>({
    year: '',
    title: '',
    description: '',
    icon_name: 'HistoryIcon',
    color: 'var(--primary-color)',
    // Para campeões
    competition_name: '',
    champion_name: '',
    champion_logo_url: '',
    runner_up_name: '',
    runner_up_logo_url: '',
    squad_photo_url: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'timeline') {
      const { data } = await supabase.from('history_timeline').select('*').order('year', { ascending: false });
      if (data) setTimeline(data);
    } else {
      const { data } = await supabase.from('hall_of_fame').select('*').order('year', { ascending: false });
      if (data) setHallOfFame(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      year: '', title: '', description: '', icon_name: 'HistoryIcon', color: 'var(--primary-color)',
      competition_name: '', champion_name: '', champion_logo_url: '', runner_up_name: '', runner_up_logo_url: '',
      squad_photo_url: ''
    });
  };

  const handleSave = async () => {
    try {
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

      if (editingId) {
        const { error } = await supabase.from(table).update(dataToSave).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert([dataToSave]);
        if (error) throw error;
      }
      
      alert('Salvo com sucesso!');
      resetForm();
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message + '\n\nCertifique-se de que a tabela "' + (activeTab === 'timeline' ? 'history_timeline' : 'hall_of_fame') + '" existe no Supabase.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este item permanentemente?')) return;
    const table = activeTab === 'timeline' ? 'history_timeline' : 'hall_of_fame';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="section-title"><HistoryIcon /> GESTÃO INSTITUCIONAL</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button 
             className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`} 
             onClick={() => { setActiveTab('timeline'); resetForm(); }}
           >
             <Clock size={18} /> Linha do Tempo
           </button>
           <button 
             className={`btn ${activeTab === 'champions' ? 'btn-primary' : 'btn-secondary'}`} 
             onClick={() => { setActiveTab('champions'); resetForm(); }}
           >
             <Trophy size={18} /> Galeria de Campeões
           </button>
        </div>
      </div>

      <div className="premium-card" style={{ padding: '2rem', marginBottom: '3rem', border: editingId ? '2px solid var(--primary-color)' : 'none' }}>
        <h2 style={{ fontWeight: 950, marginBottom: '1.5rem' }}>
          {editingId ? 'Editar Registro' : (activeTab === 'timeline' ? 'Novo Marco Histórico' : 'Adicionar Campeão Antigo')}
        </h2>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Ano</label>
            <input type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="Ex: 2021" />
          </div>

          {activeTab === 'timeline' ? (
            <>
              <div className="form-group">
                <label>Título</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Início das atividades" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição</label>
                <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Nome da Competição</label>
                <input type="text" value={formData.competition_name} onChange={e => setFormData({...formData, competition_name: e.target.value})} placeholder="Ex: Copa APD 2021" />
              </div>
              <div className="form-group">
                <label>Time Campeão</label>
                <input type="text" value={formData.champion_name} onChange={e => setFormData({...formData, champion_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Logo do Campeão (URL)</label>
                <input type="text" value={formData.champion_logo_url} onChange={e => setFormData({...formData, champion_logo_url: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Vice-Campeão (Opcional)</label>
                <input type="text" value={formData.runner_up_name} onChange={e => setFormData({...formData, runner_up_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Logo do Vice (URL)</label>
                <input type="text" value={formData.runner_up_logo_url} onChange={e => setFormData({...formData, runner_up_logo_url: e.target.value})} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Foto do Elenco Campeão (URL)</label>
                <input type="text" value={formData.squad_photo_url} onChange={e => setFormData({...formData, squad_photo_url: e.target.value})} placeholder="URL de uma foto do time completo com o troféu" />
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
           <button className="btn btn-primary" onClick={handleSave} disabled={!formData.year}>
             <Save size={18} /> Salvar Registro
           </button>
           {editingId && <button className="btn btn-secondary" onClick={resetForm}>Cancelar</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="fs-comps-list">
          {activeTab === 'timeline' ? (
            timeline.map(item => (
              <div key={item.id} className="fs-comp-item" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 950, width: '80px', color: item.color }}>{item.year}</div>
                <div style={{ flex: 1 }}>
                   <h4 style={{ margin: 0, fontWeight: 900 }}>{item.title}</h4>
                   <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-app-icon" onClick={() => { setEditingId(item.id); setFormData(item); }}><Edit size={14}/></button>
                  <button className="btn-app-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(item.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            ))
          ) : (
            hallOfFame.map(item => (
              <div key={item.id} className="fs-comp-item" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 950, width: '80px' }}>{item.year}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <img src={item.champion_logo_url} style={{ width: 30, height: 30, objectFit: 'contain' }} alt="" />
                   <div>
                     <h4 style={{ margin: 0, fontWeight: 900 }}>{item.champion_name}</h4>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.competition_name}</span>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-app-icon" onClick={() => { setEditingId(item.id); setFormData(item); }}><Edit size={14}/></button>
                  <button className="btn-app-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(item.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            ))
          )}
          {(activeTab === 'timeline' ? timeline : hallOfFame).length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
               <AlertCircle size={32} style={{ margin: '0 auto 10px' }} />
               <p>Nenhum registro encontrado para esta aba.</p>
               <p style={{ fontSize: '0.7rem' }}>Crie a tabela <b>{activeTab === 'timeline' ? 'history_timeline' : 'hall_of_fame'}</b> no Supabase.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
