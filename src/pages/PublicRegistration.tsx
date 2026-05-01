import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader2, Upload, Plus, Trash2, CheckCircle2, ChevronRight, ChevronLeft, Shield, User, Camera, Users } from 'lucide-react';

interface RegistrationConfig {
  required: string[];
  optional: string[];
}

export default function PublicRegistration() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkData, setLinkData] = useState<any>(null);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State - Team & Manager
  const [teamName, setTeamName] = useState('');
  const [teamShortName, setTeamShortName] = useState('');
  const [teamCity, setTeamCity] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('');

  // Form State - Players
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      if (!token) throw new Error('Token inválido');

      const { data, error } = await supabase
        .from('registration_links')
        .select(`
          id, season_id, active, expires_at,
          season:seasons(
            id, year, settings_json,
            competition:competitions(name, registration_fields)
          )
        `)
        .eq('token', token)
        .single();

      if (error || !data) throw new Error('Link de inscrição não encontrado ou inválido.');
      if (!data.active) throw new Error('Este link de inscrição foi desativado.');
      if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error('Este link de inscrição expirou.');

      setLinkData(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const addPlayer = () => {
    setPlayers([...players, { id: crypto.randomUUID(), name: '', number: '', position: 'Atacante', photo: null }]);
  };

  const updatePlayer = (id: string, field: string, value: any) => {
    setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const getRegistrationConfig = (): RegistrationConfig => {
    if (!linkData) return { required: ['name', 'number'], optional: [] };
    
    // Prioridade 1: Configuração específica da Temporada (settings_json)
    const seasonSettings = linkData.season?.settings_json?.registration;
    if (seasonSettings?.required_fields) {
      return {
        required: seasonSettings.required_fields,
        optional: [] // No motor novo, o que não é obrigatório é opcional
      };
    }

    // Prioridade 2: Configuração da Competição
    if (linkData.season?.competition?.registration_fields) {
      return linkData.season.competition.registration_fields;
    }

    // Fallback padrão
    return { required: ['name', 'number', 'position'], optional: [] };
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Validations
      if (!teamName || !managerName) throw new Error('Preencha os campos obrigatórios da equipe e gestor.');
      if (players.length === 0) throw new Error('Adicione pelo menos um jogador.');
      
      const config = getRegistrationConfig();
      
      for (const p of players) {
        if (config.required.includes('name') && !p.name) throw new Error('Todos os jogadores precisam ter Nome.');
        if (config.required.includes('number') && !p.number) throw new Error(`O jogador ${p.name || ''} precisa ter Número.`);
        if (config.required.includes('position') && !p.position) throw new Error(`O jogador ${p.name || ''} precisa ter Posição.`);
        if (config.required.includes('photo') && !p.photo) throw new Error(`O jogador ${p.name || ''} precisa ter Foto.`);
        if (config.required.includes('nickname') && !p.nickname) throw new Error(`O jogador ${p.name || ''} precisa ter Apelido.`);
        if (config.required.includes('age') && !p.age) throw new Error(`O jogador ${p.name || ''} precisa ter Idade.`);
        if (config.required.includes('document') && !p.document) throw new Error(`O jogador ${p.name || ''} precisa ter Documento/RG.`);
      }

      const { error } = await supabase.from('registration_submissions').insert([{
        registration_link_id: linkData.id,
        team_name: teamName,
        team_short_name: teamShortName,
        team_city: teamCity,
        manager_name: managerName,
        manager_email: managerEmail,
        manager_phone: managerPhone,
        players_data: players,
        status: 'pending'
      }]);

      if (error) throw new Error('Erro ao salvar inscrição. Tente novamente.');

      setStep(4); // Sucesso
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary-color)" />
        <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Validando link de inscrição...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <div style={{ width: '64px', height: '64px', background: 'var(--danger-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 900 }}>X</span>
        </div>
        <h2 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Acesso Negado</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <button className="btn btn-secondary" style={{ marginTop: '2rem' }} onClick={() => navigate('/')}>Ir para a Home</button>
      </div>
    );
  }

  const competitionName = linkData.season.competition.name;
  const config = getRegistrationConfig();

  return (
    <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="section-title" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>Portal de Inscrição</h1>
        <p style={{ color: 'var(--primary-color)', fontWeight: 800, fontSize: '1.2rem' }}>
          {competitionName} — Temporada {linkData.season.year}
        </p>
      </div>

      {/* Progress Bar */}
      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ 
              width: '40px', height: '6px', borderRadius: '3px', 
              background: s <= step ? 'var(--primary-color)' : 'var(--border-color)',
              transition: 'background 0.3s'
            }} />
          ))}
        </div>
      )}

      {/* Step 1: Institucional */}
      {step === 1 && (
        <div className="card animate-fade">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield color="var(--primary-color)" /> 1. Dados da Equipe
          </h2>
          
          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nome Completo do Time <span style={{ color: 'var(--danger-color)' }}>*</span></label>
              <input type="text" placeholder="Ex: Esporte Clube Real" value={teamName} onChange={e => setTeamName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nome Curto</label>
              <input type="text" placeholder="Ex: Real FC" value={teamShortName} onChange={e => setTeamShortName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Cidade / Bairro</label>
              <input type="text" placeholder="Ex: São Paulo - SP" value={teamCity} onChange={e => setTeamCity(e.target.value)} />
            </div>
          </div>

          <hr style={{ margin: '2.5rem 0', borderColor: 'var(--border-color)' }} />

          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User color="var(--primary-color)" /> 2. Dados do Responsável
          </h2>

          <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nome do Presidente / Gestor <span style={{ color: 'var(--danger-color)' }}>*</span></label>
              <input type="text" placeholder="Seu nome" value={managerName} onChange={e => setManagerName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>WhatsApp</label>
              <input type="text" placeholder="(11) 99999-9999" value={managerPhone} onChange={e => setManagerPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input type="email" placeholder="contato@time.com" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} />
            </div>
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!teamName || !managerName}>
              Avançar para Elenco <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Elenco */}
      {step === 2 && (
        <div className="animate-fade">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users color="var(--primary-color)" /> Elenco Oficial
            </h2>
            <button className="btn btn-secondary" onClick={addPlayer} style={{ background: 'var(--primary-dark)', color: 'white', border: 'none' }}>
              <Plus size={16} /> Adicionar Jogador
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {players.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-color)', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Nenhum jogador adicionado ainda.</p>
                <button className="btn btn-primary" onClick={addPlayer}>+ Adicionar o 1º Jogador</button>
              </div>
            ) : (
              players.map((p, index) => (
                <div key={p.id} className="card" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                  
                  {/* Photo area (Optional mockup) */}
                  <div style={{ width: '60px', height: '60px', background: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                    <Camera size={20} color="var(--text-muted)" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 150px', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nome Completo</label>
                      <input type="text" placeholder="Nome do atleta" value={p.name} onChange={e => updatePlayer(p.id, 'name', e.target.value)} style={{ padding: '0.5rem', fontSize: '0.9rem' }} />
                    </div>
                    {config.required.includes('number') && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Camisa</label>
                        <input type="text" placeholder="Ex: 10" value={p.number} onChange={e => updatePlayer(p.id, 'number', e.target.value)} style={{ padding: '0.5rem', fontSize: '0.9rem', textAlign: 'center' }} />
                      </div>
                    )}
                    {config.required.includes('position') && (
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Posição</label>
                        <select value={p.position} onChange={e => updatePlayer(p.id, 'position', e.target.value)} style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
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
                    )}
                  </div>

                  <button 
                    onClick={() => removePlayer(p.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: '0.5rem', marginTop: '1.2rem' }}
                    title="Remover Jogador"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={18} /> Voltar
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)} disabled={players.length === 0}>
              Revisar e Enviar <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="card animate-fade">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '2rem', textAlign: 'center' }}>
            Revisão da Inscrição
          </h2>
          
          <div style={{ background: 'var(--surface-alt)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary-color)' }}>{teamName}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <div><strong>Responsável:</strong> {managerName}</div>
              <div><strong>WhatsApp:</strong> {managerPhone || '-'}</div>
              <div><strong>Cidade:</strong> {teamCity || '-'}</div>
              <div><strong>Atletas listados:</strong> {players.length}</div>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', marginBottom: '2.5rem' }}>
            Atenção: Ao enviar, os dados serão avaliados pela organização. Você não poderá alterar a lista até que um administrador solicite correção.
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={submitting}>
              <ChevronLeft size={18} /> Voltar
            </button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
              Confirmar e Enviar Inscrição
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="card animate-fade" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--primary-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--text-main)' }}>Inscrição Enviada!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto 3rem' }}>
            Sua solicitação de inscrição para o time <strong>{teamName}</strong> foi enviada com sucesso para a organização da <strong>{competitionName}</strong>.
          </p>
          <div style={{ padding: '1.5rem', background: 'var(--surface-alt)', borderRadius: '12px', display: 'inline-block', textAlign: 'left' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><strong>O que acontece agora?</strong></p>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>A organização irá revisar seus dados.</li>
              <li>Se houver alguma pendência, entrarão em contato.</li>
              <li>Sendo aprovado, seu time aparecerá no site oficial!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
