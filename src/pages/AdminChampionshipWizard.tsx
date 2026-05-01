import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, 
  Globe, Layout, Settings, ShieldCheck, Calendar as CalendarIcon, 
  FileCheck2, Activity, Eye, Send, Plus, Trophy,
  Users, Palette, ListOrdered, AlertCircle, Trash2, Copy
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export default function AdminChampionshipWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  // ─── Form State ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    // Step 1: Identity
    name: '',
    slug: '',
    description: '',
    primary_color: '#16a34a',
    secondary_color: '#0f172a',
    year: new Date().getFullYear(),
    
    // Step 2: Model
    templateId: '',
    
    // Step 3: Structure
    type: 'groups_knockout',
    teamCount: 16,
    groupCount: 4,
    qualifiedPerGroup: 2,
    hasThirdPlace: true,
    knockoutPhases: ['quarter', 'semi', 'final'],

    // Step 4: Rules
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tieBreakers: ['points', 'wins', 'goal_diff', 'goals_for'],
    yellowForSuspension: 3,
    woScoreHome: 3,
    woScoreAway: 0,
    penaltiesEnabled: true,

    // Step 5: Calendar
    startDate: '',
    endDate: '',
    matchDays: ['domingo'],
    
    // Step 6: Registration
    regMode: 'distributed',
    regStart: '',
    regEnd: '',
    minPlayers: 15,
    maxPlayers: 25,
    requiredFields: ['name', 'number', 'position'],

    // Step 7: Statistics
    enabledStats: ['goals', 'assists', 'yellow_cards', 'red_cards', 'clean_sheets']
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase.from('competition_templates').select('*');
    if (data) setTemplates(data);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleNext = () => setStep((prev) => (prev + 1) as Step);
  const handleBack = () => setStep((prev) => (prev - 1) as Step);

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Criar Competição
      const { data: comp, error: compErr } = await supabase.from('competitions').insert([{
        name: formData.name,
        slug: formData.slug,
        type: formData.type,
        description: formData.description,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color
      }]).select().single();
      
      if (compErr) throw compErr;

      // 2. Criar Temporada com configurações estendidas
      const { data: season, error: seasonErr } = await supabase.from('seasons').insert([{
        competition_id: comp.id,
        year: formData.year,
        status: 'draft',
        settings_json: {
          points: { win: formData.pointsWin, draw: formData.pointsDraw, loss: formData.pointsLoss },
          discipline: { yellow_for_suspension: formData.yellowForSuspension },
          wo_score: [formData.woScoreHome, formData.woScoreAway],
          penalties_enabled: formData.penaltiesEnabled,
          stats_enabled: formData.enabledStats,
          tie_breakers: formData.tieBreakers,
          registration: {
             start: formData.regStart,
             end: formData.regEnd,
             limits: { min: formData.minPlayers, max: formData.maxPlayers },
             required_fields: formData.requiredFields
          }
        }
      }]).select().single();

      if (seasonErr) throw seasonErr;

      // 3. Gerar Fases Automaticamente
      const phasesToCreate = [];
      if (formData.type === 'groups_knockout') {
        phasesToCreate.push({ season_id: season.id, name: 'Fase de Grupos', type: 'group', order_index: 0 });
        formData.knockoutPhases.forEach((p, idx) => {
          phasesToCreate.push({ season_id: season.id, name: p.toUpperCase(), type: p, order_index: idx + 1 });
        });
      }

      await supabase.from('stages').insert(phasesToCreate);

      // 4. Gerar Link Mágico
      const token = Math.random().toString(36).substring(2, 10) + season.id.split('-')[0];
      await supabase.from('registration_links').insert([{
        season_id: season.id,
        token: token,
        active: true
      }]);

      // 5. Criar Política de Inscrição (Motor Novo)
      await supabase.from('registration_policies').insert([{
        season_id: season.id,
        registration_mode: formData.regMode,
        min_players: formData.minPlayers,
        max_players: formData.maxPlayers,
        required_fields: formData.requiredFields,
        registration_open_date: formData.regStart || null,
        registration_close_date: formData.regEnd || null
      }]);

      alert('🚀 Campeonato criado com sucesso!');
      navigate(`/admin/${comp.slug}/${formData.year}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Step Renderers ────────────────────────────────────────────────────────
  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="animate-fade">
          <h2 className="step-title"><Globe /> Etapa 1: Identidade Visual</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome do Campeonato</label>
              <input type="text" placeholder="Ex: Copa do Mundo APD 2026" value={formData.name} onChange={e => {
                const name = e.target.value;
                setFormData({...formData, name, slug: generateSlug(name)});
              }} />
            </div>
            <div className="form-group">
              <label>Slug (URL)</label>
              <input type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Descrição Breve</label>
            <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid-2" style={{ marginTop: '1.5rem' }}>
             <div className="form-group">
                <label>Cor Primária</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="color" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} style={{ width: '50px', padding: 0 }} />
                   <input type="text" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} />
                </div>
             </div>
             <div className="form-group">
                <label>Cor Secundária</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="color" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} style={{ width: '50px', padding: 0 }} />
                   <input type="text" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} />
                </div>
             </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="animate-fade">
          <h2 className="step-title"><Layout /> Etapa 2: Modelo de Campeonato</h2>
          <div className="template-grid">
            {templates.map(t => (
              <div 
                key={t.id} 
                className={`template-card ${formData.templateId === t.id ? 'active' : ''}`}
                onClick={() => setFormData({...formData, templateId: t.id, type: t.structure_config.type})}
              >
                <div className="template-icon"><Trophy size={32} /></div>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <div className="template-badge">{t.structure_config.type}</div>
              </div>
            ))}
          </div>
        </div>
      );
      case 3: return (
        <div className="animate-fade">
          <h2 className="step-title"><ListOrdered /> Etapa 3: Estrutura</h2>
          <div className="grid-2">
             <div className="form-group">
                <label>Quantidade de Equipes</label>
                <input type="number" value={formData.teamCount} onChange={e => setFormData({...formData, teamCount: parseInt(e.target.value)})} />
             </div>
             <div className="form-group">
                <label>Número de Grupos</label>
                <input type="number" value={formData.groupCount} onChange={e => setFormData({...formData, groupCount: parseInt(e.target.value)})} />
             </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
             <label>Fases do Mata-Mata</label>
             <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                {['oitavas', 'quarter', 'semi', 'final'].map(p => (
                   <label key={p} className="check-chip">
                      <input 
                        type="checkbox" 
                        checked={formData.knockoutPhases.includes(p)} 
                        onChange={() => {
                          const phases = formData.knockoutPhases.includes(p) 
                            ? formData.knockoutPhases.filter(item => item !== p)
                            : [...formData.knockoutPhases, p];
                          setFormData({...formData, knockoutPhases: phases});
                        }}
                      />
                      {p.toUpperCase()}
                   </label>
                ))}
             </div>
          </div>
        </div>
      );
      case 4: return (
        <div className="animate-fade">
           <h2 className="step-title"><ShieldCheck /> Etapa 4: Regras & Pontuação</h2>
           <div className="grid-3">
              <div className="form-group">
                 <label>Vitória</label>
                 <input type="number" value={formData.pointsWin} onChange={e => setFormData({...formData, pointsWin: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                 <label>Empate</label>
                 <input type="number" value={formData.pointsDraw} onChange={e => setFormData({...formData, pointsDraw: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                 <label>Derrota</label>
                 <input type="number" value={formData.pointsLoss} onChange={e => setFormData({...formData, pointsLoss: parseInt(e.target.value)})} />
              </div>
           </div>
           <div className="form-group" style={{ marginTop: '2rem' }}>
              <label>Critérios de Desempate (Arraste para ordenar)</label>
              <div className="drag-list">
                 {formData.tieBreakers.map((t, i) => (
                    <div key={t} className="drag-item">
                       <span>{i + 1}. {t.toUpperCase()}</span>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => {
                             const newList = [...formData.tieBreakers];
                             if (i > 0) { [newList[i-1], newList[i]] = [newList[i], newList[i-1]]; }
                             setFormData({...formData, tieBreakers: newList});
                          }}><ChevronLeft size={14} rotate={90} /></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      );
      case 8: return (
         <div className="animate-fade">
            <h2 className="step-title"><Eye /> Etapa 8: Pré-Visualização</h2>
            <div className="premium-card" style={{ padding: '2rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                  <div>
                     <h3 style={{ fontSize: '1.5rem', fontWeight: 950 }}>{formData.name || 'Sem nome'}</h3>
                     <p style={{ color: 'var(--text-muted)' }}>{formData.description || 'Sem descrição'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                     <div style={{ width: '30px', height: '30px', background: formData.primary_color, borderRadius: '50%' }} />
                     <div style={{ width: '30px', height: '30px', background: formData.secondary_color, borderRadius: '50%' }} />
                  </div>
               </div>

               <div className="grid-3" style={{ gap: '1rem' }}>
                  <div className="summary-item">
                     <strong>Estrutura</strong>
                     <span>{formData.type} ({formData.teamCount} times)</span>
                  </div>
                  <div className="summary-item">
                     <strong>Mata-Mata</strong>
                     <span>{formData.knockoutPhases.length} fases</span>
                  </div>
                  <div className="summary-item">
                     <strong>Inscrições</strong>
                     <span>{formData.minPlayers} - {formData.maxPlayers} atletas</span>
                  </div>
               </div>
            </div>
         </div>
      );
      case 9: return (
        <div className="animate-fade" style={{ textAlign: 'center', padding: '3rem 0' }}>
           <CheckCircle2 size={80} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
           <h2 style={{ fontSize: '2rem', fontWeight: 950, marginBottom: '1rem' }}>Tudo Pronto!</h2>
           <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
              Ao clicar em publicar, o motor irá gerar automaticamente todas as fases, rodadas e links de acesso. O campeonato nascerá configurado profissionalmente.
           </p>
           <button 
              className="btn btn-primary" 
              style={{ padding: '1rem 4rem', fontSize: '1.1rem' }}
              onClick={handleSave}
              disabled={loading}
           >
              {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />} PUBLICAR CAMPEONATO AGORA
           </button>
        </div>
      );
      case 5: return (
        <div className="animate-fade">
          <h2 className="step-title"><CalendarIcon /> Etapa 5: Calendário & Frequência</h2>
          <div className="grid-2">
             <div className="form-group">
                <label>Data de Início</label>
                <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
             </div>
             <div className="form-group">
                <label>Data de Término (Estimada)</label>
                <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
             </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
             <label>Dias de Jogo Permitidos</label>
             <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                {['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'].map(d => (
                   <label key={d} className="check-chip">
                      <input 
                        type="checkbox" 
                        checked={formData.matchDays.includes(d)} 
                        onChange={() => {
                          const days = formData.matchDays.includes(d) 
                            ? formData.matchDays.filter(item => item !== d)
                            : [...formData.matchDays, d];
                          setFormData({...formData, matchDays: days});
                        }}
                      />
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                   </label>
                ))}
             </div>
          </div>
        </div>
      );
      case 6: return (
        <div className="animate-fade">
          <h2 className="step-title"><FileCheck2 /> Etapa 6: Configuração de Inscrições</h2>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
             <label>Modo de Inscrição</label>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '0.5rem' }}>
                {[
                   { id: 'centralized', label: 'Centralizado', desc: 'Admin/Presidente cadastra tudo' },
                   { id: 'distributed', label: 'Distribuído', desc: 'Jogadores se cadastram via link' },
                   { id: 'hybrid', label: 'Híbrido', desc: 'Presidente inicia, jogador completa' }
                ].map(m => (
                   <label key={m.id} className={`template-card ${formData.regMode === m.id ? 'active' : ''}`} style={{ padding: '1rem', textAlign: 'center' }}>
                      <input type="radio" name="regMode" checked={formData.regMode === m.id} onChange={() => setFormData({...formData, regMode: m.id})} style={{ display: 'none' }} />
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{m.label}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.desc}</span>
                   </label>
                ))}
             </div>
          </div>
          <div className="grid-2">
             <div className="form-group">
                <label>Mínimo de Atletas</label>
                <input type="number" value={formData.minPlayers} onChange={e => setFormData({...formData, minPlayers: parseInt(e.target.value)})} />
             </div>
             <div className="form-group">
                <label>Máximo de Atletas</label>
                <input type="number" value={formData.maxPlayers} onChange={e => setFormData({...formData, maxPlayers: parseInt(e.target.value)})} />
             </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
             <label>Campos Obrigatórios na Ficha</label>
             <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                {['photo', 'nickname', 'age', 'document'].map(f => (
                   <label key={f} className="check-chip">
                      <input 
                        type="checkbox" 
                        checked={formData.requiredFields.includes(f)} 
                        onChange={() => {
                          const fields = formData.requiredFields.includes(f) 
                            ? formData.requiredFields.filter(item => item !== f)
                            : [...formData.requiredFields, f];
                          setFormData({...formData, requiredFields: fields});
                        }}
                      />
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                   </label>
                ))}
             </div>
          </div>
        </div>
      );
      case 7: return (
        <div className="animate-fade">
          <h2 className="step-title"><Activity /> Etapa 7: Estatísticas & Métricas</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Selecione quais estatísticas o motor deve processar e exibir para este campeonato.</p>
          <div className="grid-3" style={{ gap: '1rem' }}>
             {[
                { id: 'goals', label: 'Artilharia (Gols)', icon: Trophy },
                { id: 'assists', label: 'Assistências', icon: Users },
                { id: 'clean_sheets', label: 'Clean Sheets (Goleiros)', icon: ShieldCheck },
                { id: 'yellow_cards', label: 'Cartões Amarelos', icon: AlertCircle },
                { id: 'red_cards', label: 'Cartões Vermelhos', icon: AlertCircle },
                { id: 'mvp', label: 'MVP (Craque do Jogo)', icon: Trophy }
             ].map(stat => (
                <label key={stat.id} className={`template-card ${formData.enabledStats.includes(stat.id) ? 'active' : ''}`} style={{ padding: '1.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                         type="checkbox" 
                         checked={formData.enabledStats.includes(stat.id)}
                         onChange={() => {
                            const stats = formData.enabledStats.includes(stat.id)
                               ? formData.enabledStats.filter(s => s !== stat.id)
                               : [...formData.enabledStats, stat.id];
                            setFormData({...formData, enabledStats: stats});
                         }}
                      />
                      <stat.icon size={18} />
                      <strong style={{ fontSize: '0.9rem' }}>{stat.label}</strong>
                   </div>
                </label>
             ))}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="wizard-container">
      {/* Sidebar Progress */}
      <div className="wizard-sidebar">
         <div className="wizard-logo">
            <Trophy color="var(--primary-color)" size={32} />
            <div>
               <strong>MOTOR APD</strong>
               <span>V4.0 Profissional</span>
            </div>
         </div>

         <div className="wizard-steps">
            {[
              { id: 1, label: 'Identidade', icon: Globe },
              { id: 2, label: 'Modelo', icon: Layout },
              { id: 3, label: 'Estrutura', icon: ListOrdered },
              { id: 4, label: 'Regras', icon: ShieldCheck },
              { id: 5, label: 'Calendário', icon: CalendarIcon },
              { id: 6, label: 'Inscrições', icon: FileCheck2 },
              { id: 7, label: 'Estatísticas', icon: Activity },
              { id: 8, label: 'Preview', icon: Eye },
              { id: 9, label: 'Publicação', icon: Send },
            ].map(s => (
               <div key={s.id} className={`wizard-step-item ${step === s.id ? 'active' : ''} ${step > s.id ? 'completed' : ''}`}>
                  <div className="step-icon"><s.icon size={18} /></div>
                  <div className="step-label">
                     <span className="step-num">PASSO {s.id}</span>
                     <span className="step-text">{s.label}</span>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Main Content */}
      <div className="wizard-main">
         <div className="wizard-content">
            {renderStep()}
         </div>

         {step < 9 && (
            <div className="wizard-footer">
               <button className="btn btn-secondary" onClick={handleBack} disabled={step === 1}>
                  <ChevronLeft size={18} /> Voltar
               </button>
               <button className="btn btn-primary" onClick={handleNext}>
                  Próximo Passo <ChevronRight size={18} />
               </button>
            </div>
         )}
      </div>

      <style>{`
        .wizard-container {
           display: flex;
           height: 100vh;
           background: var(--bg-color);
           overflow: hidden;
        }

        .wizard-sidebar {
           width: 300px;
           background: #0f172a;
           color: white;
           padding: 2.5rem;
           display: flex;
           flex-direction: column;
        }

        .wizard-logo {
           display: flex;
           align-items: center;
           gap: 12px;
           margin-bottom: 4rem;
        }

        .wizard-logo strong { display: block; font-size: 1.1rem; letter-spacing: 1px; }
        .wizard-logo span { font-size: 0.7rem; opacity: 0.5; text-transform: uppercase; }

        .wizard-steps { display: flex; flex-direction: column; gap: 1.5rem; }

        .wizard-step-item {
           display: flex;
           align-items: center;
           gap: 15px;
           opacity: 0.4;
           transition: all 0.3s;
        }

        .wizard-step-item.active { opacity: 1; transform: translateX(10px); }
        .wizard-step-item.completed { opacity: 0.7; }
        .wizard-step-item.completed .step-icon { background: var(--success); color: white; }

        .step-icon {
           width: 40px;
           height: 40px;
           background: rgba(255,255,255,0.05);
           border-radius: 12px;
           display: flex;
           align-items: center;
           justify-content: center;
        }

        .wizard-step-item.active .step-icon { background: var(--primary-color); color: black; }

        .step-label { display: flex; flex-direction: column; }
        .step-num { font-size: 0.65rem; font-weight: 800; opacity: 0.5; }
        .step-text { font-size: 0.9rem; font-weight: 700; }

        .wizard-main {
           flex: 1;
           display: flex;
           flex-direction: column;
           overflow-y: auto;
           padding: 4rem;
        }

        .wizard-content { flex: 1; max-width: 900px; width: 100%; margin: 0 auto; }

        .step-title {
           font-size: 2rem;
           font-weight: 950;
           margin-bottom: 2.5rem;
           display: flex;
           align-items: center;
           gap: 15px;
        }

        .wizard-footer {
           display: flex;
           justify-content: space-between;
           max-width: 900px;
           width: 100%;
           margin: 3rem auto 0;
           padding-top: 2rem;
           border-top: 1px solid var(--border-color);
        }

        .template-grid {
           display: grid;
           grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
           gap: 1.5rem;
        }

        .template-card {
           background: var(--card-bg);
           padding: 2rem;
           border-radius: 20px;
           border: 2px solid var(--border-color);
           cursor: pointer;
           transition: all 0.3s;
        }

        .template-card:hover { transform: translateY(-5px); border-color: var(--primary-color); }
        .template-card.active { border-color: var(--primary-color); background: var(--primary-light); }

        .template-icon { margin-bottom: 1.5rem; color: var(--primary-color); }
        .template-card h3 { font-weight: 900; margin-bottom: 0.5rem; }
        .template-card p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; }
        .template-badge { display: inline-block; margin-top: 1rem; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; background: rgba(0,0,0,0.05); borderRadius: 5px; text-transform: uppercase; }

        .check-chip {
           padding: 8px 16px;
           background: var(--surface-alt);
           border: 1px solid var(--border-color);
           border-radius: 10px;
           cursor: pointer;
           font-size: 0.85rem;
           font-weight: 700;
           display: flex;
           align-items: center;
           gap: 8px;
        }

        .check-chip input { margin: 0; }

        .drag-list { display: flex; flex-direction: column; gap: 8px; }
        .drag-item {
           padding: 1rem;
           background: var(--card-bg);
           border: 1px solid var(--border-color);
           border-radius: 10px;
           display: flex;
           justify-content: space-between;
           align-items: center;
           font-weight: 700;
        }

        .summary-item {
           background: var(--surface-alt);
           padding: 1.5rem;
           border-radius: 15px;
           display: flex;
           flex-direction: column;
           gap: 5px;
        }
        .summary-item strong { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; }
        .summary-item span { font-weight: 800; font-size: 1rem; }
      `}</style>
    </div>
  );
}
