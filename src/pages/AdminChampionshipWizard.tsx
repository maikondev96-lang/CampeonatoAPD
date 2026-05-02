import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, 
  Globe, Layout, ShieldCheck, Calendar as CalendarIcon, 
  FileCheck2, Activity, Eye, Send, Trophy,
  ListOrdered
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export default function AdminChampionshipWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  
  // ─── Form State ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    primary_color: '#16a34a',
    secondary_color: '#0f172a',
    year: new Date().getFullYear(),
    templateId: '',
    type: 'groups_knockout',
    teamCount: 16,
    groupCount: 4,
    qualifiedPerGroup: 2,
    hasThirdPlace: true,
    knockoutPhases: ['quarter', 'semi', 'final'],
    pointsWin: 3,
    pointsDraw: 1,
    pointsLoss: 0,
    tieBreakers: ['points', 'wins', 'goal_diff', 'goals_for'],
    yellowForSuspension: 3,
    woScoreHome: 3,
    woScoreAway: 0,
    penaltiesEnabled: true,
    format: 'groups_2_top_2',
    startDate: '',
    endDate: '',
    matchDays: ['domingo'],
    regMode: 'distributed',
    regStart: '',
    regEnd: '',
    minPlayers: 15,
    maxPlayers: 25,
    requiredFields: ['name', 'number', 'position'],
    enabledStats: ['goals', 'assists', 'yellow_cards', 'red_cards', 'clean_sheets']
  });

  // 1. DATA LAYER (READ)
  const templatesQuery = useQuery({
    queryKey: ['competition-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('competition_templates').select('*');
      if (error) throw error;
      return data;
    }
  });

  const { state, data: templates, refetch } = useQueryEngine(templatesQuery);

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleNext = () => setStep((prev) => (prev + 1) as Step);
  const handleBack = () => setStep((prev) => (prev - 1) as Step);

  const handleSave = async () => {
    await AdminEngine.safeMutation({
      mutationFn: async () => {
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

        // 2. Criar Temporada
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
            },
            format: formData.format
          }
        }]).select().single();

        if (seasonErr) throw seasonErr;

        // 3. Gerar Fases
        const phasesToCreate = [];
        if (formData.type === 'groups_knockout') {
          phasesToCreate.push({ season_id: season.id, name: 'Fase de Grupos', type: 'group', order_index: 0 });
          formData.knockoutPhases.forEach((p, idx) => {
            phasesToCreate.push({ season_id: season.id, name: p.toUpperCase(), type: p, order_index: idx + 1 });
          });
        }
        await supabase.from('stages').insert(phasesToCreate);

        // 4. Token & Link
        const token = Math.random().toString(36).substring(2, 10) + season.id.split('-')[0];
        await supabase.from('registration_links').insert([{ season_id: season.id, token: token, active: true }]);

        // 5. Política
        await supabase.from('registration_policies').insert([{
          season_id: season.id,
          registration_mode: formData.regMode,
          min_players: formData.minPlayers,
          max_players: formData.maxPlayers,
          required_fields: formData.requiredFields,
          registration_open_date: formData.regStart || null,
          registration_close_date: formData.regEnd || null
        }]);

        return comp;
      },
      invalidateKeys: [['competitions'], ['seasons']],
      onSuccess: (comp: any) => {
        alert('🚀 Campeonato criado com sucesso!');
        navigate(`/admin/${comp.slug}/${formData.year}`);
      },
      onError: (err: any) => alert(err.message)
    });
  };

  const renderStep = () => {
    switch(step) {
      case 1: return (
        <div className="animate-fade">
          <h2 className="step-title"><Globe /> Etapa 1: Identidade Visual</h2>
          <div className="form-grid">
            <div className="form-group">
              <label>Nome do Campeonato</label>
              <input type="text" className="form-input" placeholder="Ex: Copa do Mundo APD 2026" value={formData.name} onChange={e => {
                const name = e.target.value;
                setFormData({...formData, name, slug: generateSlug(name)});
              }} />
            </div>
            <div className="form-group">
              <label>Slug (URL)</label>
              <input type="text" className="form-input" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label>Descrição Breve</label>
            <textarea className="form-input" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="grid-2" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div className="form-group">
                <label>Cor Primária</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="color" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} style={{ width: '50px', padding: 0 }} />
                   <input type="text" className="form-input" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} />
                </div>
             </div>
             <div className="form-group">
                <label>Cor Secundária</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input type="color" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} style={{ width: '50px', padding: 0 }} />
                   <input type="text" className="form-input" value={formData.secondary_color} onChange={e => setFormData({...formData, secondary_color: e.target.value})} />
                </div>
             </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="animate-fade">
          <h2 className="step-title"><Layout /> Etapa 2: Modelo de Campeonato</h2>
          <QueryView state={state} data={templates} onRetry={refetch}>
            {(templateList) => (
              <div className="template-grid">
                {templateList.map((t: any) => (
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
            )}
          </QueryView>
        </div>
      );
      case 3: return (
        <div className="animate-fade">
          <h2 className="step-title"><ListOrdered /> Etapa 3: Estrutura</h2>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div className="form-group">
                <label>Quantidade de Equipes</label>
                <input type="number" className="form-input" value={formData.teamCount} onChange={e => setFormData({...formData, teamCount: parseInt(e.target.value)})} />
             </div>
             <div className="form-group">
                <label>Número de Grupos</label>
                <input type="number" className="form-input" value={formData.groupCount} onChange={e => setFormData({...formData, groupCount: parseInt(e.target.value)})} />
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
          <div className="form-group" style={{ marginTop: '1.5rem' }}>
             <label>Lógica de Chaveamento Automático</label>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {[
                   { id: 'groups_2_top_2', label: '2 Grupos → Semis', desc: '1A vs 2B e 1B vs 2A' },
                   { id: 'league_top_4', label: 'Liga → Top 4', desc: '1º vs 4º e 2º vs 3º' }
                ].map(f => (
                   <label key={f.id} className={`template-card ${formData.format === f.id ? 'active' : ''}`} style={{ padding: '1rem' }}>
                      <input type="radio" name="format" checked={formData.format === f.id} onChange={() => setFormData({...formData, format: f.id})} style={{ display: 'none' }} />
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>{f.label}</strong>
                      <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{f.desc}</span>
                   </label>
                ))}
             </div>
          </div>
        </div>
      );
      case 4: return (
        <div className="animate-fade">
           <h2 className="step-title"><ShieldCheck /> Etapa 4: Regras & Pontuação</h2>
           <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                 <label>Vitória</label>
                 <input type="number" className="form-input" value={formData.pointsWin} onChange={e => setFormData({...formData, pointsWin: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                 <label>Empate</label>
                 <input type="number" className="form-input" value={formData.pointsDraw} onChange={e => setFormData({...formData, pointsDraw: parseInt(e.target.value)})} />
              </div>
              <div className="form-group">
                 <label>Derrota</label>
                 <input type="number" className="form-input" value={formData.pointsLoss} onChange={e => setFormData({...formData, pointsLoss: parseInt(e.target.value)})} />
              </div>
           </div>
        </div>
      );
      case 5: return (
        <div className="animate-fade">
          <h2 className="step-title"><CalendarIcon /> Etapa 5: Calendário & Frequência</h2>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div className="form-group">
                <label>Data de Início</label>
                <input type="date" className="form-input" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
             </div>
             <div className="form-group">
                <label>Data de Término</label>
                <input type="date" className="form-input" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
             </div>
          </div>
        </div>
      );
      case 6: return (
        <div className="animate-fade">
          <h2 className="step-title"><FileCheck2 /> Etapa 6: Inscrições</h2>
          <div className="form-group">
             <label>Modo de Inscrição</label>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {['centralized', 'distributed', 'hybrid'].map(m => (
                   <label key={m} className={`template-card ${formData.regMode === m ? 'active' : ''}`} style={{ padding: '1rem', textAlign: 'center' }}>
                      <input type="radio" checked={formData.regMode === m} onChange={() => setFormData({...formData, regMode: m})} style={{ display: 'none' }} />
                      <strong style={{ display: 'block', fontSize: '0.9rem' }}>{m.toUpperCase()}</strong>
                   </label>
                ))}
             </div>
          </div>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
             <div className="form-group">
                <label>Mínimo de Atletas</label>
                <input type="number" className="form-input" value={formData.minPlayers} onChange={e => setFormData({...formData, minPlayers: parseInt(e.target.value)})} />
             </div>
             <div className="form-group">
                <label>Máximo de Atletas</label>
                <input type="number" className="form-input" value={formData.maxPlayers} onChange={e => setFormData({...formData, maxPlayers: parseInt(e.target.value)})} />
             </div>
          </div>
        </div>
      );
      case 7: return (
        <div className="animate-fade">
          <h2 className="step-title"><Activity /> Etapa 7: Estatísticas</h2>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
             {['goals', 'assists', 'yellow_cards', 'red_cards', 'clean_sheets'].map(stat => (
                <label key={stat} className={`template-card ${formData.enabledStats.includes(stat) ? 'active' : ''}`} style={{ padding: '1.5rem' }}>
                   <input type="checkbox" checked={formData.enabledStats.includes(stat)} onChange={() => {
                     const stats = formData.enabledStats.includes(stat) ? formData.enabledStats.filter(s => s !== stat) : [...formData.enabledStats, stat];
                     setFormData({...formData, enabledStats: stats});
                   }} /> {stat.toUpperCase()}
                </label>
             ))}
          </div>
        </div>
      );
      case 8: return (
        <div className="animate-fade">
           <h2 className="step-title"><Eye /> Etapa 8: Pré-Visualização</h2>
           <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 950 }}>{formData.name || 'Sem nome'}</h3>
              <p style={{ color: 'var(--text-muted)' }}>{formData.description || 'Sem descrição'}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                 <div className="summary-item"><strong>Times</strong><span>{formData.teamCount}</span></div>
                 <div className="summary-item"><strong>Fases</strong><span>{formData.knockoutPhases.length + 1}</span></div>
                 <div className="summary-item"><strong>Modo</strong><span>{formData.regMode}</span></div>
              </div>
           </div>
        </div>
      );
      case 9: return (
        <div className="animate-fade" style={{ textAlign: 'center', padding: '3rem 0' }}>
           <CheckCircle2 size={80} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
           <h2 style={{ fontSize: '2rem', fontWeight: 950 }}>Tudo Pronto!</h2>
           <button 
              className="btn btn-primary" 
              style={{ padding: '1rem 4rem', fontSize: '1.1rem', marginTop: '2rem' }}
              onClick={handleSave}
              disabled={AdminEngine.isMutating}
           >
              {AdminEngine.isMutating ? <Loader2 className="animate-spin" /> : <Send size={20} />} PUBLICAR CAMPEONATO
           </button>
        </div>
      );
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-sidebar">
         <div className="wizard-logo">
            <Trophy color="var(--primary-color)" size={32} />
            <div><strong>MOTOR APD</strong><span>V4.0 Profissional</span></div>
         </div>
         <div className="wizard-steps">
            {[1,2,3,4,5,6,7,8,9].map(i => (
               <div key={i} className={`wizard-step-item ${step === i ? 'active' : ''} ${step > i ? 'completed' : ''}`}>
                  <div className="step-icon">{i}</div>
                  <div className="step-label"><span className="step-text">Etapa {i}</span></div>
               </div>
            ))}
         </div>
      </div>

      <div className="wizard-main">
         <div className="wizard-content">{renderStep()}</div>
         {step < 9 && (
            <div className="wizard-footer">
               <button className="btn btn-secondary" onClick={handleBack} disabled={step === 1}><ChevronLeft size={18} /> Voltar</button>
               <button className="btn btn-primary" onClick={handleNext}>Próximo Passo <ChevronRight size={18} /></button>
            </div>
         )}
      </div>

      <style>{`
        .wizard-container { display: flex; height: 100vh; background: var(--bg-color); overflow: hidden; }
        .wizard-sidebar { width: 260px; background: #0f172a; color: white; padding: 2.5rem; display: flex; flex-direction: column; }
        .wizard-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 3rem; }
        .wizard-logo strong { display: block; font-size: 1.1rem; }
        .wizard-logo span { font-size: 0.7rem; opacity: 0.5; }
        .wizard-steps { display: flex; flex-direction: column; gap: 1rem; }
        .wizard-step-item { display: flex; align-items: center; gap: 12px; opacity: 0.4; transition: all 0.3s; }
        .wizard-step-item.active { opacity: 1; transform: translateX(5px); }
        .wizard-step-item.completed { opacity: 0.7; }
        .step-icon { width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; }
        .wizard-step-item.active .step-icon { background: var(--primary-color); color: black; }
        .wizard-main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 3rem; }
        .wizard-content { flex: 1; max-width: 800px; width: 100%; margin: 0 auto; }
        .step-title { font-size: 1.8rem; font-weight: 950; margin-bottom: 2rem; display: flex; align-items: center; gap: 12px; }
        .wizard-footer { display: flex; justify-content: space-between; max-width: 800px; width: 100%; margin: 2rem auto 0; padding-top: 1.5rem; border-top: 1px solid var(--border-color); }
        .template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .template-card { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; border: 2px solid var(--border-color); cursor: pointer; transition: all 0.3s; }
        .template-card:hover { border-color: var(--primary-color); }
        .template-card.active { border-color: var(--primary-color); background: rgba(234, 179, 8, 0.05); }
        .check-chip { padding: 8px 12px; background: var(--surface-alt); border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 6px; }
        .summary-item { background: var(--surface-alt); padding: 1rem; border-radius: 12px; text-align: center; }
        .summary-item strong { display: block; font-size: 0.7rem; color: var(--text-muted); }
        .summary-item span { font-weight: 900; font-size: 1.1rem; }
      `}</style>
    </div>
  );
}
