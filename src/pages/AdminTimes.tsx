import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Team } from '../types';
import { Plus, Shield, Trash2, Loader2, Upload, Image as ImageIcon, X, Edit2, Save } from 'lucide-react';

const AdminTimes = () => {
  const [times, setTimes] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTimes();
  }, []);

  const fetchTimes = async () => {
    const { data, error } = await supabase.from('teams').select('*').order('name');
    if (!error) setTimes(data || []);
    setLoading(false);
  };

  const handleEdit = (time: Team) => {
    setEditingId(time.id);
    setName(time.name);
    setPreviewUrl(time.logo_url);
    setFile(null); // File is only for new uploads
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setFile(null);
    setPreviewUrl('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert('Informe o nome do time');
    
    setSaving(true);

    try {
      let finalLogoUrl = previewUrl;

      // 1. Upload to Supabase Storage if a new file is selected
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `team-logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, file);

        if (uploadError) throw new Error('Erro no upload: ' + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(filePath);
          
        finalLogoUrl = publicUrl;
      }

      if (!finalLogoUrl) throw new Error('Selecione o escudo do time');

      // 2. Save to Database (Insert or Update)
      if (editingId) {
        const { error: dbError } = await supabase
          .from('teams')
          .update({ name, logo_url: finalLogoUrl })
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase.from('teams').insert([{ 
          name, 
          logo_url: finalLogoUrl 
        }]);
        if (dbError) throw dbError;
      }

      setName('');
      setFile(null);
      setPreviewUrl('');
      setEditingId(null);
      fetchTimes();
      alert(editingId ? 'Time atualizado!' : 'Time adicionado!');
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar time');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, logoUrl: string) => {
    if (!confirm('Tem certeza que deseja excluir este time? Todos os jogadores e jogos vinculados serão afetados.')) return;
    
    // Try to delete from storage first if it's a supabase URL
    if (logoUrl.includes('supabase.co')) {
      const path = logoUrl.split('/public/logos/')[1];
      if (path) {
        await supabase.storage.from('logos').remove([path]);
      }
    }

    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (!error) fetchTimes();
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="section-title"><Shield /> Gerenciar Times</h1>
      
      <form className="card" onSubmit={handleSave} style={{ marginBottom: '3rem' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 800 }}>{editingId ? '📝 Editar Time' : '➕ Novo Time'}</h3>
        <div className="form-group">
          <label>Nome do Time</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Brasil" />
        </div>
        
        <div className="form-group">
          <label>Escudo do Time</label>
          <div 
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            
            {previewUrl ? (
              <div style={{ position: 'relative' }}>
                <img src={previewUrl} className="dropzone-preview" alt="Preview" />
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(''); }}
                  style={{ position: 'absolute', top: -10, right: -10, background: 'var(--error)', borderRadius: '50%', padding: '4px', color: 'white', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} color="var(--text-muted)" />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <strong>Clique para carregar</strong> ou arraste o escudo aqui
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PNG, JPG ou SVG (Máx. 2MB)</div>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus />} 
            {editingId ? 'Atualizar Time' : 'Adicionar Time'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn btn-secondary">Cancelar</button>
          )}
        </div>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="admin-grid">
          {times.map(time => (
            <div key={time.id} className="card card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src={time.logo_url} alt={time.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                <span style={{ fontWeight: 950, color: 'var(--primary-dark)', fontSize: '1rem' }}>{time.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => handleEdit(time)} style={{ color: 'var(--primary-dark)', background: 'none', padding: '8px' }}>
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(time.id, time.logo_url)} style={{ color: 'var(--error)', background: 'none', padding: '8px' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {times.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', width: '100%' }}>Nenhum time cadastrado</p>}
        </div>
      )}
    </div>
  );
};

export default AdminTimes;
