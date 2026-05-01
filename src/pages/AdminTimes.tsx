import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Team } from '../types';
import { Plus, Shield, Trash2, Loader2, Upload, Image as ImageIcon, X, Edit2, Save, Link as LinkIcon, Copy, RefreshCw, CheckCircle, AlertCircle, Unlock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAdminContext } from '../components/AdminContext';

const AdminTimes = () => {
  const { activeSeason, loading: ctxLoading } = useAdminContext();
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
    if (activeSeason) fetchTimes();

    // Atualiza os dados automaticamente quando o admin volta para a aba
    const onFocus = () => { if (activeSeason) fetchTimes(); };
    window.addEventListener('focus', onFocus);
    
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [activeSeason]);

  const fetchTimes = async () => {
    if (!activeSeason) return;
    setLoading(true);
    const { data, error } = await supabase.from('season_teams')
      .select('team:teams(*, players(*))')
      .eq('season_id', activeSeason.id);
      
    if (!error && data) {
      const formattedTeams = data.map(st => st.team as unknown as Team).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
      setTimes(formattedTeams);
    }
    setLoading(false);
  };

  const handleEdit = (time: Team) => {
    setEditingId(time.id);
    setName(time.name);
    setPreviewUrl(time.logo_url);
    setFile(null);
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

      if (editingId) {
        const { error: dbError } = await supabase
          .from('teams')
          .update({ name, logo_url: finalLogoUrl })
          .eq('id', editingId);
        if (dbError) throw dbError;
      } else {
        const { data: newTeam, error: dbError } = await supabase.from('teams').insert([{ 
          name, 
          logo_url: finalLogoUrl 
        }]).select().single();
        if (dbError) throw dbError;
        
        // Enroll in current season
        if (newTeam) {
          const { error: stError } = await supabase.from('season_teams').insert([{
            season_id: activeSeason?.id,
            team_id: newTeam.id
          }]);
          if (stError) throw stError;
        }
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
    
    if (logoUrl.includes('supabase.co')) {
      const path = logoUrl.split('/public/logos/')[1];
      if (path) {
        await supabase.storage.from('logos').remove([path]);
      }
    }

    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (!error) fetchTimes();
  };

  const generateInvite = async (teamId: string) => {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expira em 7 dias

    const { error } = await supabase
      .from('teams')
      .update({ 
        invite_token: token, 
        invite_expires_at: expiresAt.toISOString(),
        roster_status: 'enviado' 
      })
      .eq('id', teamId);

    if (error) {
      alert('Erro ao gerar link de convite.');
    } else {
      fetchTimes();
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/elenco/${token}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado para a área de transferência!');
  };

  const handleStatusChange = async (teamId: string, status: 'pendente' | 'aprovado') => {
    const { error } = await supabase
      .from('teams')
      .update({ roster_status: status })
      .eq('id', teamId);
      
    if (error) alert('Erro ao alterar status');
    else fetchTimes();
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="section-title"><Shield /> Gerenciar Times e Elencos</h1>
      
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

      {loading || ctxLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
      ) : !activeSeason ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Nenhuma temporada ativa selecionada.</div>
      ) : (
        <div className="admin-grid">
          {times.map(time => (
            <div key={time.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
              
              {/* Header do Card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <img src={time.logo_url} alt={time.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                  <span style={{ fontWeight: 950, color: 'var(--primary-dark)', fontSize: '1.1rem' }}>{time.name}</span>
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

              {/* Status e Ações de Elenco */}
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Status do Elenco:</strong>
                  {time.roster_status === 'finalizado' && <span style={{ color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}><AlertCircle size={16} /> Aguardando Aprovação</span>}
                  {time.roster_status === 'aprovado' && <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}><CheckCircle size={16} /> Aprovado</span>}
                  {time.roster_status === 'enviado' && <span style={{ color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800 }}>Preenchendo...</span>}
                  {(!time.roster_status || time.roster_status === 'pendente') && <span style={{ color: 'var(--text-muted)' }}>Pendente</span>}
                </div>

                {!time.invite_token ? (
                  <button className="btn btn-primary" onClick={() => generateInvite(time.id)} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                    <LinkIcon size={16} /> Gerar Link de Convite
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Link de Acesso do Capitão</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/elenco/${time.invite_token}`} 
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }} 
                        />
                        <button className="btn btn-primary" onClick={() => copyInviteLink(time.invite_token!)} style={{ padding: '0.5rem 1rem' }} title="Copiar Link">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Link de Auto-Inscrição (Atletas)</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/join/team/${time.invite_token}`} 
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 700 }} 
                        />
                        <button className="btn btn-primary" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/join/team/${time.invite_token!}`);
                          alert('Link de inscrição copiado!');
                        }} style={{ padding: '0.5rem 1rem' }} title="Copiar Link">
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <a href={`/elenco/${time.invite_token}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '0.5rem' }}>
                        👀 Ver Página
                      </a>
                      <button className="btn btn-secondary" onClick={() => {
                        if(confirm('Isso invalidará o link antigo e criará um novo do zero. O capitão perderá o acesso antigo. Deseja continuar?')) {
                          generateInvite(time.id);
                        }
                      }} style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '0.5rem' }}>
                        <RefreshCw size={14} /> Novo Link
                      </button>
                    </div>
                    {time.roster_status === 'finalizado' && (
                      <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', marginTop: '1rem', border: '1px solid var(--border-color)' }}>
                        <h4 style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Preview do Elenco ({time.players?.length || 0})</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', maxHeight: '100px', overflowY: 'auto' }}>
                          {time.players?.map(p => (
                            <span key={p.id} style={{ fontSize: '0.7rem', background: 'var(--surface-alt)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                              {p.shirt_number ? `${p.shirt_number}-` : ''}{p.name}
                            </span>
                          ))}
                          {(!time.players || time.players.length === 0) && <span style={{ fontSize: '0.7rem', color: 'var(--error)' }}>Nenhum jogador</span>}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <button className="btn btn-primary" onClick={() => handleStatusChange(time.id, 'aprovado')} style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '0.6rem', background: '#22c55e', color: 'white', border: 'none' }}>
                            <CheckCircle size={14} /> Aprovar
                          </button>
                          <button className="btn btn-secondary" onClick={() => handleStatusChange(time.id, 'pendente')} style={{ justifyContent: 'center', fontSize: '0.75rem', padding: '0.6rem', color: 'var(--error)', borderColor: 'var(--error)' }}>
                            <Unlock size={14} /> Rejeitar/Reabrir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
