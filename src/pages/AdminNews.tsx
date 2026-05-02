import React, { useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, Edit, Save, Globe, Upload, Link as LinkIcon, Image, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

export default function AdminNews() {
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    category: 'Geral',
    is_published: true,
    is_featured: false,
    external_url: ''
  });

  // 1. DATA LAYER (READ)
  const query = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { state, data, refetch } = useQueryEngine(query);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `news-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('news')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('news')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error: any) {
      alert('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title) return alert('Título é obrigatório');
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        if (editingId) {
          const { error } = await supabase.from('news').update(formData).eq('id', editingId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('news').insert([formData]);
          if (error) throw error;
        }
      },
      invalidateKeys: [['news']],
      onSuccess: () => {
        alert('Notícia salva com sucesso!');
        setEditingId(null);
        setFormData({ title: '', subtitle: '', content: '', image_url: '', category: 'Geral', is_published: true, is_featured: false, external_url: '' });
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta notícia definitivamente?')) return;
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('news').delete().eq('id', id);
        if (error) throw error;
      },
      invalidateKeys: [['news']],
      onSuccess: () => refetch(),
      onError: (err: any) => alert(err.message)
    });
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title"><Globe /> MOTOR DE CONTEÚDO APD</h1>
        <button className="btn btn-primary" onClick={() => {
          setEditingId(null);
          setFormData({ title: '', subtitle: '', content: '', image_url: '', category: 'Geral', is_published: true, is_featured: false, external_url: '' });
          document.getElementById('news-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}>
          <Plus size={18} /> Nova Notícia
        </button>
      </div>

      <div className="card" id="news-form" style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontWeight: 900 }}>{editingId ? 'Editar Notícia' : 'Publicar Nova Notícia'}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="form-group">
            <label className="input-label">Capa da Notícia</label>
            <div 
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                height: '200px', 
                borderRadius: '15px', 
                border: '2px dashed var(--border-color)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                background: formData.image_url ? `url(${formData.image_url}) center/cover no-repeat` : 'var(--surface-alt)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s'
              }}
            >
              {formData.image_url && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }}></div>}
              
              <div style={{ position: 'relative', textAlign: 'center', color: formData.image_url ? 'white' : 'inherit' }}>
                {uploading ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} style={{ marginBottom: '10px' }} />}
                <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{uploading ? 'Enviando...' : 'Arraste a capa ou clique para selecionar'}</p>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
            </div>
            {formData.image_url && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="text" className="form-input" value={formData.image_url} readOnly style={{ fontSize: '0.7rem', opacity: 0.6 }} />
                <button type="button" className="btn btn-secondary" onClick={() => setFormData({...formData, image_url: ''})} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Limpar</button>
              </div>
            )}
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Título Chamativo</label>
            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Grande Final da Copa APD acontece este Domingo!" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Subtítulo / Olho da Matéria</label>
            <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} placeholder="Ex: Expectativa de recorde de público para o clássico..." />
          </div>
          
          <div className="form-group">
             <label>Link Externo (Opcional - ex: post no Instagram)</label>
             <div style={{ position: 'relative' }}>
                <LinkIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                <input 
                  type="text" 
                  value={formData.external_url} 
                  onChange={e => setFormData({...formData, external_url: e.target.value})} 
                  placeholder="https://instagram.com/..." 
                  style={{ paddingLeft: '38px' }}
                />
             </div>
          </div>
          <div className="form-group">
             <label>Categoria (Escolha ou digite uma nova)</label>
             <input 
               list="categories-list"
               value={formData.category} 
               onChange={e => setFormData({...formData, category: e.target.value})}
               placeholder="Ex: Polêmica, Entrevista, Geral..."
             />
             <datalist id="categories-list">
                <option value="Geral" />
                <option value="Competição" />
                <option value="Avisos" />
                <option value="POLÊMICA" />
                <option value="ENTREVISTA" />
                <option value="PLANTÃO" />
                <option value="MERCADO DA BOLA" />
                <option value="RESENHA" />
             </datalist>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
          <label>Conteúdo da Matéria (Markdown Suportado)</label>
          <textarea rows={8} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Escreva aqui o texto completo da notícia... (Opcional se você quiser apenas postar a imagem)" />
        </div>
        
        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', alignItems: 'center' }}>
           <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}>
              <input type="checkbox" checked={formData.is_published} onChange={e => setFormData({...formData, is_published: e.target.checked})} />
              Publicar imediatamente
           </label>
           <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700 }}>
              <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
              Destaque na Home (Banner Grande)
           </label>
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
           <button className="btn btn-primary" onClick={handleSave} disabled={!formData.title || uploading}>
             <Save size={18} /> {editingId ? 'Atualizar Notícia' : 'Salvar Notícia'}
           </button>
           {editingId && <button className="btn btn-secondary" onClick={() => {
             setEditingId(null);
             setFormData({ title: '', subtitle: '', content: '', image_url: '', category: 'Geral', is_published: true, is_featured: false, external_url: '' });
           }}>Cancelar</button>}
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {(data || []).map(item => (
          <div key={item.id} className="premium-card" style={{ display: 'flex', gap: '1.5rem', padding: '1.25rem' }}>
            <div style={{ width: '120px', height: '100px', background: 'var(--surface-alt)', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
              {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Image size={24} style={{ margin: '35px 48px', opacity: 0.2 }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary-color)' }}>{item.category}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => {
                    setEditingId(item.id);
                    setFormData({ ...item });
                    document.getElementById('news-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Edit size={16} /></button>
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, margin: '4px 0' }}>{item.title}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.subtitle}</p>
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {item.is_published ? <CheckCircle size={14} color="var(--success)" /> : <XCircle size={14} color="var(--text-muted)" />}
                {item.external_url && <LinkIcon size={12} color="var(--primary-color)" />}
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
