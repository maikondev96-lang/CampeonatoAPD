import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Competition, Season } from '../types';
import { Loader2, Plus, Globe, Settings, Copy, CheckCircle2, ChevronRight, X, Layers, Share2 } from 'lucide-react';

export default function AdminCompetitions() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal/Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // New Competition/Season form
  const [compName, setCompName] = useState('');
  const [compSlug, setCompSlug] = useState('');
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [inheritFrom, setInheritFrom] = useState('');
  const [allowRegistrations, setAllowRegistrations] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: compData } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
    const { data: seasonData } = await supabase
      .from('seasons')
      .select('*, registration_links(token)')
      .order('year', { ascending: false });
    
    if (compData) setCompetitions(compData);
    if (seasonData) setSeasons(seasonData as any);
    setLoading(false);
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${token}`);
    alert('Link mágico copiado para a área de transferência!');
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleCreate = async () => {
    if (!compName || !compSlug || !seasonYear) return alert('Preencha os dados básicos');
    setSaving(true);
    try {
      // 1. Verificar se a competição já existe ou criar nova
      let competitionId = '';
      const existingComp = competitions.find(c => c.slug === compSlug);
      
      if (existingComp) {
        competitionId = existingComp.id;
      } else {
        const { data: newComp, error: compErr } = await supabase.from('competitions').insert([{
          name: compName,
          slug: compSlug,
          type: 'hybrid',
          is_active: true
        }]).select().single();
        if (compErr) throw new Error('Erro ao criar competição');
        competitionId = newComp.id;
      }

      // 2. Criar a Temporada (Season)
      const { data: newSeason, error: seasonErr } = await supabase.from('seasons').insert([{
        competition_id: competitionId,
        year: seasonYear,
        status: 'draft',
        inherited_from_season_id: inheritFrom || null,
        allow_registrations: allowRegistrations
      }]).select().single();
      if (seasonErr) throw new Error('Erro ao criar temporada');

      // 3. Gerar o Link Mágico (Registration Link)
      const token = Math.random().toString(36).substring(2, 10) + newSeason.id.split('-')[0];
      await supabase.from('registration_links').insert([{
        season_id: newSeason.id,
        token: token,
        active: true
      }]);

      alert('✅ Campeonato e Temporada criados com sucesso!');
      setIsWizardOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCompName('');
    setCompSlug('');
    setSeasonYear(new Date().getFullYear());
    setInheritFrom('');
    setWizardStep(1);
  };

  if (loading) return <div style={{ padding: '5rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-fade" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><Globe /> Campeonatos</h1>
        <button className="btn btn-primary" onClick={() => setIsWizardOpen(true)}>
          <Plus size={18} /> Novo Campeonato
        </button>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {competitions.map(comp => (
          <div key={comp.id} className="premium-card">
            <div className="premium-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-dark)', margin: 0 }}>{comp.name}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>/{comp.slug}</span>
              </div>
              <span className="badge" style={{ background: 'var(--bg-color)', color: 'var(--primary-color)', border: '1px solid var(--primary-light)' }}>
                {comp.type}
              </span>
            </div>
            
            <div style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>Temporadas</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {seasons.filter(s => s.competition_id === comp.id).map(season => (
                  <div key={season.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--surface-alt)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 900 }}>
                        {season.year}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        Status: <span style={{ color: season.status === 'active' ? 'var(--primary-color)' : 'var(--text-muted)' }}>{season.status}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {season.registration_links?.[0]?.token && (
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: 'var(--primary-color)', color: 'white' }} onClick={() => season.registration_links?.[0]?.token && handleCopyLink(season.registration_links[0].token)}>
                          <Share2 size={14} /> Copiar Link
                        </button>
                      )}
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <Settings size={14} /> Configurar
                      </button>
                    </div>
                  </div>
                ))}
                {seasons.filter(s => s.competition_id === comp.id).length === 0 && (
                  <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>Nenhuma temporada cadastrada.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Wizard */}
      {isWizardOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card animate-fade" style={{ width: '100%', maxWidth: '600px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Módulo de Criação de Campeonatos</h2>
              <button onClick={() => setIsWizardOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X /></button>
            </div>
            
            <div style={{ padding: '2rem' }}>
              {wizardStep === 1 && (
                <div className="animate-fade">
                  <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Passo 1: Dados Básicos</h3>
                  <div className="form-group">
                    <label>Nome do Campeonato</label>
                    <input type="text" placeholder="Ex: Copa APD" value={compName} onChange={(e) => { setCompName(e.target.value); setCompSlug(generateSlug(e.target.value)); }} />
                  </div>
                  <div className="form-group">
                    <label>Slug (URL Base)</label>
                    <input type="text" value={compSlug} onChange={(e) => setCompSlug(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Ano da Temporada</label>
                    <input type="number" value={seasonYear} onChange={(e) => setSeasonYear(parseInt(e.target.value))} />
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="animate-fade">
                  <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>Passo 2: Herança e Regras</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                    Selecione se esta nova temporada deve ser construída do zero ou herdar formato, regras e métricas de uma edição anterior.
                  </p>
                  
                  <div className="form-group">
                    <label>Base (Herdar Configurações)</label>
                    <select value={inheritFrom} onChange={(e) => setInheritFrom(e.target.value)}>
                      <option value="">Nova Temporada / Criar do zero</option>
                      {seasons.map(s => (
                        <option key={s.id} value={s.id}>{competitions.find(c => c.id === s.competition_id)?.name} - {s.year}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
                      <input type="checkbox" checked={allowRegistrations} onChange={(e) => setAllowRegistrations(e.target.checked)} />
                      Ativar Link Mágico de Inscrição imediatamente
                    </label>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  disabled={wizardStep === 1}
                  onClick={() => setWizardStep(1)}
                >
                  Voltar
                </button>
                {wizardStep === 1 ? (
                  <button type="button" className="btn btn-primary" onClick={() => setWizardStep(2)}>
                    Avançar <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} Finalizar e Gerar Link
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
