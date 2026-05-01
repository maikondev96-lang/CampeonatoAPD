import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Player, Team } from '../types';
import { Users, Upload, Shield, Image as ImageIcon, Loader2, CheckCircle, Trash2, Edit2, AlertCircle, Save, X, Plus } from 'lucide-react';
import { playerSchema } from '../utils/schemas';
import { validateImageUrl } from '../utils/imageValidation';

const ElencoPublico = () => {
  const { token } = useParams<{ token: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [name, setName] = useState('');
  const [shirtNumber, setShirtNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [position, setPosition] = useState<any>('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) fetchTeamAndPlayers();
  }, [token]);

  const fetchTeamAndPlayers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('invite_token', token)
        .single();
        
      if (teamErr || !teamData) throw new Error('Link de convite inválido ou expirado.');
      setTeam(teamData);

      const { data: playersData, error: pErr } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamData.id)
        .order('shirt_number');
        
      if (!pErr && playersData) {
        setPlayers(playersData);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
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
      // Validate image URL if provided
      if (photoUrl && photoUrl !== previewUrl) {
        const imgCheck = await validateImageUrl(photoUrl);
        if (!imgCheck.valid) throw new Error(imgCheck.error);
      }

      const validation = playerSchema.safeParse({
        name,
        team_id: team?.id,
        shirt_number: shirtNumber,
        photo_url: photoUrl || previewUrl,
        position
      });

      if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
      }

      let finalPhotoUrl = photoUrl || previewUrl || '';

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
      const action = editingId ? 'update' : 'insert';
      
      const { error } = await supabase.rpc('manage_roster_player', {
        p_token: token,
        p_action: action,
        p_player_id: editingId || '00000000-0000-0000-0000-000000000000',
        p_name: name,
        p_shirt_number: pNum,
        p_photo_url: finalPhotoUrl,
        p_age: null,
        p_position: position || null
      });

      if (error) throw new Error(error.message);

      setName('');
      setShirtNumber('');
      setPosition('');
      setPhotoUrl('');
      setFile(null);
      setPreviewUrl('');
      setEditingId(null);
      
      fetchTeamAndPlayers();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar jogador.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingId(player.id);
    setName(player.name);
    setShirtNumber(player.shirt_number?.toString() || '');
    setPosition(player.position || '');
    setPhotoUrl(player.photo_url || '');
    setPreviewUrl(player.photo_url || '');
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setShirtNumber('');
    setPosition('');
    setPhotoUrl('');
    setPreviewUrl('');
    setFile(null);
  };

  const handleDelete = async (player: Player) => {
    if (!confirm(`Deseja remover ${player.name} do elenco?`)) return;
    
    try {
      const { error } = await supabase.rpc('manage_roster_player', {
        p_token: token,
        p_action: 'delete',
        p_player_id: player.id,
        p_name: '', p_shirt_number: 0, p_photo_url: '', p_age: 0, p_position: ''
      });
      if (error) throw new Error(error.message);
      fetchTeamAndPlayers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFinalize = async () => {
    if (players.length === 0) return alert('Adicione pelo menos um jogador para finalizar.');
    if (!confirm('Após finalizar, você não poderá editar o elenco até que a organização libere. Confirmar?')) return;
    
    try {
      const { error } = await supabase.rpc('finalize_roster', { p_token: token });
      if (error) throw new Error(error.message);
      alert('Elenco enviado para aprovação com sucesso!');
      fetchTeamAndPlayers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="animate-spin" size={32} /></div>;
  if (errorMsg) return <div className="card" style={{ maxWidth: 400, margin: '4rem auto', textAlign: 'center', color: 'var(--error)' }}><AlertCircle size={48} style={{ margin: '0 auto 1rem' }} /><h3>{errorMsg}</h3></div>;
  if (!team) return null;

  const isLocked = team.roster_status === 'finalizado' || team.roster_status === 'aprovado';

  return (
    <div className="animate-fade container" style={{ maxWidth: '800px', paddingBottom: '4rem' }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <img src={team.logo_url} alt={team.name} style={{ width: 80, height: 80, objectFit: 'contain' }} />
        <div>
          <h1 style={{ fontWeight: 950, fontSize: '1.5rem', color: 'var(--primary-dark)' }}>Elenco: {team.name}</h1>
          <p style={{ color: 'var(--text-muted)' }}>Preencha os dados dos seus jogadores para o campeonato.</p>
        </div>
        {isLocked && (
          <div style={{ background: '#fef3c7', color: '#b45309', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {team.roster_status === 'aprovado' ? <CheckCircle size={18} color="#22c55e" /> : <Loader2 size={18} />} 
            {team.roster_status === 'aprovado' ? 'Elenco Aprovado!' : 'Elenco Aguardando Aprovação'}
          </div>
        )}
      </div>

      {!isLocked && (
        <form className="card" onSubmit={handleSave} style={{ marginBottom: '3rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 950, color: 'var(--primary-dark)' }}>
            {editingId ? '📝 Editar Jogador' : '➕ Novo Jogador'}
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label>Nome Completo *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: José Silva" required />
            </div>
            <div className="form-group">
              <label>Número da Camisa *</label>
              <input type="number" value={shirtNumber} onChange={e => setShirtNumber(e.target.value)} placeholder="10" required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', height: '48px' }} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />} 
              {editingId ? 'Atualizar Jogador' : 'Adicionar Jogador'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="btn btn-secondary">Cancelar</button>
            )}
          </div>
        </form>
      )}

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Jogadores Cadastrados ({players.length})</h3>
          {!isLocked && players.length > 0 && (
            <button className="btn btn-primary" onClick={handleFinalize} style={{ background: '#22c55e', color: 'white', border: 'none' }}>
              <CheckCircle size={16} /> Finalizar Elenco
            </button>
          )}
        </div>
        
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Nº</th>
                <th>Jogador</th>
                <th>Posição</th>
                {!isLocked && <th style={{ textAlign: 'right' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id}>
                  <td style={{ fontWeight: 900, color: 'var(--primary-dark)', fontSize: '1.1rem' }}>{player.shirt_number || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {player.photo_url ? <img src={player.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={16} color="var(--text-muted)" />}
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{player.name}</span>
                    </div>
                  </td>
                  <td>{player.position || '-'}</td>
                  {!isLocked && (
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleEdit(player)} style={{ background: 'none', color: 'var(--text-main)', padding: '8px' }}><Edit2 size={16}/></button>
                      <button onClick={() => handleDelete(player)} style={{ background: 'none', color: 'var(--error)', padding: '8px' }}><Trash2 size={16}/></button>
                    </td>
                  )}
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Nenhum jogador cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ElencoPublico;
