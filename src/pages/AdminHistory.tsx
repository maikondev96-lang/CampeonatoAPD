import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { History as HistoryIcon, Plus, Save, Trash2, Loader2, Edit, AlertCircle, Clock } from 'lucide-react';

export default function AdminHistory() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    year: '',
    title: '',
    description: '',
    icon_name: 'HistoryIcon',
    color: 'var(--primary-color)'
  });

  useEffect(() => {
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    setLoading(true);
    // Tentamos buscar da tabela 'history_timeline'
    const { data, error } = await supabase
      .from('history_timeline')
      .select('*')
      .order('year', { ascending: false });
    
    if (!error && data) {
      setTimeline(data);
    } else {
      console.warn("Tabela history_timeline não encontrada ou vazia. Usando dados locais para demonstração.");
      // Fallback para não quebrar a UI enquanto a tabela não é criada
      setTimeline([]);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const { error } = await supabase.from('history_timeline').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('history_timeline').insert([formData]);
        if (error) throw error;
      }
      alert('Evento de história salvo com sucesso!');
      setEditingId(null);
      setFormData({ year: '', title: '', description: '', icon_name: 'HistoryIcon', color: 'var(--primary-color)' });
      fetchTimeline();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message + '\n\nCertifique-se de que a tabela "history_timeline" existe no seu banco de dados Supabase.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este marco da história?')) return;
    try {
      const { error } = await supabase.from('history_timeline').delete().eq('id', id);
      if (error) throw error;
      fetchTimeline();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  if (loading && timeline.length === 0) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title"><HistoryIcon /> GESTÃO DA LINHA DO TEMPO</h1>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({ year: '', title: '', description: '', icon_name: 'HistoryIcon', color: 'var(--primary-color)' });
        }}>
          <Plus size={18} /> Novo Marco
        </button>
      </div>

      <div className="premium-card" style={{ padding: '2rem', marginBottom: '3rem', border: editingId ? '2px solid var(--primary-color)' : 'none' }}>
        <h2 style={{ fontWeight: 950, marginBottom: '1.5rem' }}>{editingId ? 'Editar Marco Histórico' : 'Adicionar Novo Ano'}</h2>
        
        <div className="grid-2">
          <div className="form-group">
            <label>Ano</label>
            <input type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} placeholder="Ex: 2026" />
          </div>
          <div className="form-group">
            <label>Título do Evento</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Fundação da Associação" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Descrição Detalhada</label>
            <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descreva o que aconteceu de importante neste ano..." />
          </div>
          <div className="form-group">
            <label>Cor do Ícone (Hex ou Variável)</label>
            <input type="text" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="#22c55e ou var(--primary-color)" />
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
           <button className="btn btn-primary" onClick={handleSave} disabled={!formData.year || !formData.title}>
             <Save size={18} /> {editingId ? 'Atualizar Marco' : 'Salvar Marco'}
           </button>
           {editingId && <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>}
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="premium-card" style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 800 }}>Nenhum dado encontrado no banco de dados.</p>
          <p style={{ fontSize: '0.9rem' }}>Os dados exibidos na página pública ainda podem estar vindo do arquivo fixo.</p>
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '12px', textAlign: 'left', fontSize: '0.8rem' }}>
            <strong>SQL para criar a tabela:</strong>
            <pre style={{ marginTop: '10px', overflowX: 'auto', background: '#000', color: '#0f0', padding: '1rem', borderRadius: '8px' }}>
{`CREATE TABLE history_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon_name TEXT DEFAULT 'HistoryIcon',
  color TEXT DEFAULT 'var(--primary-color)',
  created_at TIMESTAMPTZ DEFAULT now()
);`}
            </pre>
          </div>
        </div>
      ) : (
        <div className="fs-comps-list">
          {timeline.map(item => (
            <div key={item.id} className="fs-comp-item" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 950, color: item.color, width: '80px' }}>{item.year}</div>
              <div style={{ flex: 1 }}>
                <h3 className="fs-comp-name">{item.title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.description}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-app-icon" onClick={() => {
                  setEditingId(item.id);
                  setFormData({ ...item });
                }}><Edit size={16} /></button>
                <button className="btn-app-icon" style={{ color: 'var(--error)' }} onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
