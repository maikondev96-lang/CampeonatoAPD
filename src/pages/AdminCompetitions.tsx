import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Competition, Season } from '../types';
import { Loader2, Plus, Globe, Settings, Copy, CheckCircle2, ChevronRight, X, Layers, Share2, Trophy, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';
import { AdminEngine } from '../admin/adminEngine';

export default function AdminCompetitions() {
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

  // 1. DATA LAYER (READ)
  const query = useQuery({
    queryKey: ['admin-competitions'],
    queryFn: async () => {
      const [compRes, seasonRes] = await Promise.all([
        supabase.from('competitions').select('*').order('created_at', { ascending: false }),
        supabase.from('seasons').select('*, registration_links(token)').order('year', { ascending: false })
      ]);

      if (compRes.error) throw compRes.error;
      if (seasonRes.error) throw seasonRes.error;

      return {
        competitions: compRes.data as Competition[],
        seasons: seasonRes.data as any[]
      };
    }
  });

  const { state, data, refetch } = useQueryEngine(query);

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
    
    await AdminEngine.safeMutation({
      mutationFn: async () => {
        let competitionId = '';
        const existingComp = data?.competitions.find(c => c.slug === compSlug);
        
        if (existingComp) {
          competitionId = existingComp.id;
        } else {
          const { data: newComp, error: compErr } = await supabase.from('competitions').insert([{
            name: compName,
            slug: compSlug,
            type: 'hybrid',
            is_active: true
          }]).select().single();
          if (compErr) throw compErr;
          competitionId = newComp.id;
        }

        const { data: newSeason, error: seasonErr } = await supabase.from('seasons').insert([{
          competition_id: competitionId,
          year: seasonYear,
          status: 'draft',
          inherited_from_season_id: inheritFrom || null,
          allow_registrations: allowRegistrations
        }]).select().single();
        if (seasonErr) throw seasonErr;

        const token = Math.random().toString(36).substring(2, 10) + newSeason.id.split('-')[0];
        await supabase.from('registration_links').insert([{
          season_id: newSeason.id,
          token: token,
          active: true
        }]);
      },
      invalidateKeys: [['admin-competitions'], ['competitions']],
      onSuccess: () => {
        alert('✅ Campeonato e Temporada criados com sucesso!');
        setIsWizardOpen(false);
        resetForm();
        refetch();
      },
      onError: (err: any) => alert(err.message)
    });
    setSaving(false);
  };

  const resetForm = () => {
    setCompName('');
    setCompSlug('');
    setSeasonYear(new Date().getFullYear());
    setInheritFrom('');
    setWizardStep(1);
  };

  return (
    <div className="animate-fade container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><Globe /> Gestão de Campeonatos</h1>
        <button className="btn btn-primary" onClick={() => setIsWizardOpen(true)}>
          <Plus size={18} /> Novo Campeonato
        </button>
      </div>

      <QueryView state={state} data={data} onRetry={refetch}>
        {({ competitions, seasons }) => (
          <div style={{ display: 'grid', gap: '2rem' }}>
            {competitions.map((comp: Competition) => (
              <div key={comp.id} className="card competition-card-admin" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 950, margin: 0 }}>{comp.name}</h3>
                    <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Slug: /{comp.slug}</span>
                  </div>
                  <span className="badge badge-primary">{comp.type.toUpperCase()}</span>
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} /> Temporadas Ativas & Histórico
                  </h4>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {seasons.filter((s: any) => s.competition_id === comp.id).map((season: any) => (
                      <div key={season.id} className="season-row-admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                          <div style={{ width: '50px', height: '50px', background: 'var(--primary-color)', color: 'black', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                            {season.year}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Status:</span>
                              <span className={`badge ${season.status === 'active' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>{season.status.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {season.registration_links?.[0]?.token && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCopyLink(season.registration_links[0].token)}>
                              <Share2 size={14} /> Link Mágico
                            </button>
                          )}
                          <button className="btn btn-secondary btn-sm">
                            <Settings size={14} /> Painel
                          </button>
                        </div>
                      </div>
                    ))}
                    {seasons.filter((s: any) => s.competition_id === comp.id).length === 0 && (
                      <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                        Nenhuma temporada criada para este campeonato.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryView>

      {/* MODAL WIZARD */}
      {isWizardOpen && (
        <div className="modal-overlay animate-fade">
          <div className="modal-content card" style={{ maxWidth: '600px', padding: 0 }}>
            <div className="modal-header" style={{ padding: '1.5rem', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Novo Campeonato / Temporada</h2>
              <button className="btn-icon" onClick={() => setIsWizardOpen(false)}><X /></button>
            </div>

            <div className="modal-body" style={{ padding: '2rem' }}>
              {wizardStep === 1 ? (
                <div className="animate-slide-in">
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Passo 1: Identidade</h3>
                  <div className="form-group">
                    <label className="input-label">Nome da Competição</label>
                    <input className="form-input" type="text" placeholder="Ex: Copa APD 2026" value={compName} onChange={(e) => { setCompName(e.target.value); setCompSlug(generateSlug(e.target.value)); }} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Slug da URL</label>
                    <input className="form-input" type="text" value={compSlug} onChange={(e) => setCompSlug(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="input-label">Ano da Edição</label>
                    <input className="form-input" type="number" value={seasonYear} onChange={(e) => setSeasonYear(parseInt(e.target.value))} />
                  </div>
                </div>
              ) : (
                <div className="animate-slide-in">
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem' }}>Passo 2: Configurações</h3>
                  <div className="form-group">
                    <label className="input-label">Base (Herdar Regras)</label>
                    <select className="form-input" value={inheritFrom} onChange={(e) => setInheritFrom(e.target.value)}>
                      <option value="">Nenhuma / Começar do Zero</option>
                      {data?.seasons.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.year} - {data.competitions.find((c: any) => c.id === s.competition_id)?.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700 }}>
                      <input type="checkbox" checked={allowRegistrations} onChange={(e) => setAllowRegistrations(e.target.checked)} />
                      Ativar inscrições externas via link mágico
                    </label>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
                <button className="btn btn-secondary" disabled={wizardStep === 1} onClick={() => setWizardStep(1)}>Voltar</button>
                {wizardStep === 1 ? (
                  <button className="btn btn-primary" onClick={() => setWizardStep(2)}>Próximo <ChevronRight size={18}/></button>
                ) : (
                  <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18}/>} Criar Campeonato
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
