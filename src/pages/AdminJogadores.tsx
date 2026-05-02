import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Player } from '../types';
import { Plus, Users, Trash2, Loader2, Edit2, Save, ChevronDown, ChevronUp, Search, Upload, Image as ImageIcon, X } from 'lucide-react';
import { useAdminContext } from '../components/AdminContext';

import { playerSchema } from '../utils/schemas';
import { validateImageUrl } from '../utils/imageValidation';

import { useQueryClient } from '@tanstack/react-query';
import { AdminEngine } from '../admin/adminEngine';

const AdminJogadores = () => {
  const { activeSeason: season, loading: ctxLoading } = useAdminContext();
  const queryClient = useQueryClient();
  const [times, setTimes] = useState<Team[]>([]);
  const [jogadores, setJogadores] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [position, setPosition] = useState<any>('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (season) fetchData();
  }, [season]);

  const fetchData = async () => {
    if (!season) return;
    setLoading(true);

    const [stRes, jRes] = await Promise.all([
      supabase.from('season_teams').select('team:teams(*)').eq('season_id', season.id),
      supabase.from('players').select('*, teams(name)').order('shirt_number', { ascending: true })
    ]);
    
    if (!stRes.error && stRes.data) {
      setTimes(stRes.data.map(st => st.team as unknown as Team).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)));
    }
    if (!jRes.error) setJogadores(jRes.data || []);
    setLoading(false);
  };

  const handleEdit = (e: React.MouseEvent, j: Player) => {
    e.stopPropagation();
    setEditingId(j.id);
    setName(j.name);
    setTeamId(j.team_id);
    setShirtNumber(j.shirt_number?.toString() || '');
    setPosition(j.position || '');
    setPhotoUrl(j.photo_url || '');
    setPreviewUrl(j.photo_url || '');
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setTeamId('');
    setShirtNumber('');
    setPosition('');
    setPhotoUrl('');
    setPreviewUrl('');
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    
    try {
      // Validate Image URL if provided
      if (photoUrl && photoUrl !== previewUrl) {
        setIsValidating(true);
        const imgCheck = await validateImageUrl(photoUrl);
        setIsValidating(false);
        if (!imgCheck.valid) {
          throw new Error(imgCheck.error);
        }
      }

      const validation = playerSchema.safeParse({
        name,
        team_id: teamId,
        shirt_number: shirtNumber,
        photo_url: photoUrl || previewUrl,
        position
      });

      if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
      }
      let finalPhotoUrl = previewUrl || '';

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `player-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath);
          finalPhotoUrl = publicUrl;
        }
      }

      const pNum = parseInt(shirtNumber);

      const playerData = { 
        name, 
        team_id: teamId,
        shirt_number: pNum,
        position: position || null,
        photo_url: finalPhotoUrl,
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
        invalidateKeys: [['artilharia'], ['rosters']],
        onSuccess: async () => {
          cancelEdit();
          await fetchData();
        }
      });

    } catch (err: any) {
      alert(err.message || 'Erro ao salvar jogador');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este jogador?')) return;
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) throw error;
      },
      invalidateKeys: [['artilharia'], ['rosters']],
      onSuccess: async () => {
        await fetchData();
      },
      onError: (err: any) => {
        alert('Erro ao excluir: ' + err.message);
      }
    });
  };

  const groupedPlayers = times.map(time => ({
    ...time,
    players: jogadores.filter(j => j.team_id === time.id).sort((a, b) => (a.shirt_number || 0) - (b.shirt_number || 0))
  })).filter(t => 
    searchTerm === '' || 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.players.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade container" style={{ maxWidth: '900px' }}>
      <h1 className="section-title"><Users /> Gerenciar Jogadores</h1>
      
      <form className="card" onSubmit={handleSave} style={{ marginBottom: '3rem', border: editingId ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 950, color: 'var(--primary-dark)' }}>
          {editingId ? '📝 Editar Jogador' : '➕ Novo Jogador'}
        </h3>
        
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Nome Completo *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: José Silva" required />
          </div>
          <div className="form-group">
            <label>Número da Camisa *</label>
            <input type="number" value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} placeholder="10" required />
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Time *</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)} required>
              <option value="">Selecione um time</option>
              {times.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Posição</label>
            <select value={position} onChange={e => setPosition(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="GOL">Goleiro (GOL)</option>
              <option value="ZAG">Zagueiro (ZAG)</option>
              <option value="LAT">Lateral (LAT)</option>
              <option value="VOL">Volante (VOL)</option>
              <option value="MEI">Meio-Campo (MEI)</option>
              <option value="ATA">Atacante (ATA)</option>
            </select>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Foto do Jogador (URL ou Upload)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input 
                value={photoUrl} 
                onChange={e => { setPhotoUrl(e.target.value); setPreviewUrl(e.target.value); }} 
                placeholder="https://exemplo.com/foto.jpg" 
              />
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {previewUrl && (
                  <div style={{ position: 'relative' }}>
                    <img src={previewUrl} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: '50%', border: '2px solid var(--primary-color)' }} alt="Preview" />
                    <button type="button" onClick={() => { setPreviewUrl(''); setPhotoUrl(''); }} style={{ position: 'absolute', top: -5, right: -5, background: 'var(--error)', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}><X size={10} /></button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.8rem', flex: 1 }}>
                  <Upload size={16} /> Ou Upload de Arquivo
                </button>
              </div>
            </div>
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

      {loading || ctxLoading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>
      ) : !season ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Nenhuma temporada ativa selecionada.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupedPlayers.map(time => (
            <div key={time.id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <button 
                onClick={() => setExpandedTeamId(expandedTeamId === time.id ? null : time.id)}
                style={{ 
                  width: '100%', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', 
                  alignItems: 'center', background: 'var(--card-bg)', border: 'none', cursor: 'pointer', color: 'inherit' 
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
                <div style={{ padding: '0.5rem 1.5rem 1.5rem', background: 'var(--surface-alt)', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                    {time.players.length === 0 ? (
                      <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontWeight: 700 }}>Nenhum jogador neste time</p>
                    ) : (
                      time.players.map(j => (
                        <div key={j.id} style={{ 
                          background: 'var(--card-bg)', padding: '0.75rem 1rem', borderRadius: '10px', 
                          border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 900, color: 'var(--primary-dark)' }}>{j.shirt_number || '-'}</span>
                            <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{j.name}</span>
                            {j.position && <span style={{ fontSize: '0.7rem', background: 'var(--bg-color)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>{j.position}</span>}
                          </div>
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
