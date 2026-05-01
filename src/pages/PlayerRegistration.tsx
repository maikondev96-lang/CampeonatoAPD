import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, Camera, CheckCircle2, AlertTriangle, ShieldCheck, User, Shirt, MapPin } from 'lucide-react';

export default function PlayerRegistration() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [team, setTeam] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [existingNumbers, setExistingNumbers] = useState<number[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    shirt_number: '',
    position: 'Atacante',
    phone: '',
    photo: null as File | null,
    photoUrl: ''
  });

  useEffect(() => {
    fetchData();
  }, [inviteToken]);

  const fetchData = async () => {
    try {
      if (!inviteToken) throw new Error('Token de convite não fornecido.');

      // 1. Buscar Time pelo Token
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          season_teams:season_teams(
            season:seasons(
              *,
              competition:competitions(*)
            )
          )
        `)
        .eq('invite_token', inviteToken)
        .single();

      if (teamError || !teamData) throw new Error('Time não encontrado ou link inválido.');
      
      const activeSeasonTeam = teamData.season_teams[0];
      if (!activeSeasonTeam) throw new Error('Este time não está vinculado a nenhuma temporada ativa.');
      
      setTeam(teamData);

      // 2. Buscar Política de Inscrição
      const { data: policyData } = await supabase
        .from('registration_policies')
        .select('*')
        .eq('season_id', activeSeasonTeam.season.id)
        .maybeSingle();
      
      setPolicy(policyData);

      // 3. Buscar Números já em uso (para validação em tempo real)
      const { data: players } = await supabase
        .from('players')
        .select('shirt_number')
        .eq('team_id', teamData.id);
      
      const { data: registrations } = await supabase
        .from('player_registrations')
        .select('shirt_number')
        .eq('team_id', teamData.id)
        .neq('status', 'rejected');

      const numbers = [
        ...(players?.map(p => p.shirt_number) || []),
        ...(registrations?.map(r => r.shirt_number) || [])
      ].filter(n => n !== null) as number[];
      
      setExistingNumbers(numbers);

      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, photo: file, photoUrl: URL.createObjectURL(file) });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Validations
      if (!formData.name || !formData.shirt_number) throw new Error('Nome e Número são obrigatórios.');
      
      const num = parseInt(formData.shirt_number);
      if (existingNumbers.includes(num)) {
        throw new Error(`O número ${num} já está sendo usado neste time.`);
      }

      let uploadedPhotoUrl = '';
      if (formData.photo) {
        const fileExt = formData.photo.name.split('.').pop();
        const fileName = `${team.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('players')
          .upload(fileName, formData.photo);
        
        if (uploadError) throw new Error('Erro ao fazer upload da foto.');
        uploadedPhotoUrl = supabase.storage.from('players').getPublicUrl(fileName).data.publicUrl;
      }

      const { error: insertError } = await supabase.from('player_registrations').insert([{
        team_id: team.id,
        season_id: team.season_teams[0].season.id,
        name: formData.name,
        nickname: formData.nickname,
        shirt_number: num,
        position: formData.position,
        phone: formData.phone,
        photo_url: uploadedPhotoUrl,
        status: 'pending'
      }]);

      if (insertError) throw new Error('Erro ao salvar inscrição.');

      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <Loader2 className="animate-spin" size={48} color="var(--primary-color)" />
      <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Preparando seu formulário...</p>
    </div>
  );

  if (error) return (
    <div className="card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
      <AlertTriangle size={48} color="var(--error)" style={{ margin: '0 auto 1.5rem' }} />
      <h2 style={{ marginBottom: '1rem' }}>Ops! Algo deu errado</h2>
      <p style={{ color: 'var(--text-muted)' }}>{error}</p>
      <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => navigate('/')}>Voltar para o Início</button>
    </div>
  );

  if (success) return (
    <div className="card animate-fade" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '4rem 2rem', border: '2px solid var(--primary-color)' }}>
      <div style={{ width: '80px', height: '80px', background: 'var(--primary-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
        <CheckCircle2 size={40} />
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>Inscrição Enviada!</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
        Sua solicitação para entrar no time <strong>{team.name}</strong> foi recebida. 
        Agora ela passará por uma revisão da organização.
      </p>
      <div style={{ background: 'var(--surface-alt)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', display: 'inline-block' }}>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Próximos passos:</p>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.2rem' }}>
          <li>A organização valida seus dados e foto.</li>
          <li>Sendo aprovado, seu nome aparecerá no elenco oficial.</li>
          <li>Fique de olho no WhatsApp ou com seu capitão.</li>
        </ul>
      </div>
      <div style={{ marginTop: '3rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Ir para o Site Oficial</button>
      </div>
    </div>
  );

  const competition = team.season_teams[0].season.competition;

  return (
    <div className="animate-fade" style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header Team Card */}
      <div className="card" style={{ 
        background: `linear-gradient(135deg, ${competition.primary_color || '#0f172a'} 0%, ${competition.secondary_color || '#16a34a'} 100%)`,
        padding: '3rem 2rem',
        textAlign: 'center',
        marginBottom: '-30px',
        position: 'relative',
        zIndex: 1,
        border: 'none',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
        
        <img 
          src={team.logo_url || 'https://via.placeholder.com/150'} 
          alt={team.name} 
          style={{ width: '120px', height: '120px', objectFit: 'contain', background: 'white', padding: '1rem', borderRadius: '24px', boxShadow: '0 12px 24px rgba(0,0,0,0.2)', marginBottom: '1.5rem' }} 
        />
        <h1 style={{ color: 'white', fontWeight: 900, fontSize: '1.8rem', letterSpacing: '-1px', marginBottom: '0.5rem' }}>{team.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 600 }}>
          <ShieldCheck size={16} /> <span>{competition.name}</span>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="card" style={{ 
        padding: '4rem 2.5rem 3rem',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Inscrição de Atleta</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Preencha seus dados oficiais abaixo para entrar no time.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Photo Upload Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div 
              style={{ 
                width: '100px', height: '100px', 
                borderRadius: '50%', 
                background: 'var(--bg-color)', 
                border: '2px dashed var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('photo-input')?.click()}
            >
              {formData.photoUrl ? (
                <img src={formData.photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={32} color="var(--text-subtle)" />
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.6rem', padding: '2px 0', textAlign: 'center' }}>
                ALTERAR
              </div>
            </div>
            <input id="photo-input" type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>FOTO DO PERFIL</span>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> Nome Completo <span style={{ color: 'var(--error)' }}>*</span></label>
            <input 
              type="text" 
              placeholder="Como no RG/CPF" 
              required 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              style={{ borderRadius: '12px', padding: '1rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
             <div className="form-group">
              <label>Apelido (Opcional)</label>
              <input 
                type="text" 
                placeholder="Ex: Maikinho" 
                value={formData.nickname} 
                onChange={e => setFormData({ ...formData, nickname: e.target.value })} 
                style={{ borderRadius: '12px', padding: '1rem' }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shirt size={16} /> Número <span style={{ color: 'var(--error)' }}>*</span></label>
              <input 
                type="number" 
                placeholder="Ex: 10" 
                required 
                value={formData.shirt_number} 
                onChange={e => setFormData({ ...formData, shirt_number: e.target.value })} 
                style={{ borderRadius: '12px', padding: '1rem', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem' }}
              />
              {formData.shirt_number && existingNumbers.includes(parseInt(formData.shirt_number)) && (
                <span style={{ color: 'var(--error)', fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', display: 'block' }}>Este número já está ocupado!</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} /> Posição <span style={{ color: 'var(--error)' }}>*</span></label>
            <select 
              value={formData.position} 
              onChange={e => setFormData({ ...formData, position: e.target.value })}
              style={{ borderRadius: '12px', padding: '1rem', appearance: 'none', background: 'var(--bg-color)' }}
            >
              <option value="Goleiro">Goleiro</option>
              <option value="Zagueiro">Zagueiro</option>
              <option value="Lateral">Lateral</option>
              <option value="Volante">Volante</option>
              <option value="Meia">Meia</option>
              <option value="Atacante">Atacante</option>
              <option value="Fixo">Fixo</option>
              <option value="Ala">Ala</option>
              <option value="Pivô">Pivô</option>
            </select>
          </div>

          <div className="form-group">
            <label>WhatsApp (Opcional)</label>
            <input 
              type="text" 
              placeholder="(11) 99999-9999" 
              value={formData.phone} 
              onChange={e => setFormData({ ...formData, phone: e.target.value })} 
              style={{ borderRadius: '12px', padding: '1rem' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={submitting || (formData.shirt_number !== '' && existingNumbers.includes(parseInt(formData.shirt_number)))}
            style={{ 
              marginTop: '1rem', 
              padding: '1.2rem', 
              fontSize: '1.1rem', 
              fontWeight: 900, 
              borderRadius: '16px',
              boxShadow: '0 8px 20px rgba(22, 163, 74, 0.3)'
            }}
          >
            {submitting ? <Loader2 className="animate-spin" /> : 'SOLICITAR INSCRIÇÃO'}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
        Powered by APD Intelligent Engine
      </p>
    </div>
  );
}
