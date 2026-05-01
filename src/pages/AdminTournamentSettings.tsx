import React, { useState, useEffect } from 'react';
import { useAdminContext } from '../components/AdminContext';
import { supabase } from '../supabaseClient';
import { Settings, Save, Loader2, Image as ImageIcon, Layout, ShieldCheck, Palette } from 'lucide-react';

export default function AdminTournamentSettings() {
  const { activeCompetition, activeSeason, loading: ctxLoading } = useAdminContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (activeCompetition) {
      setName(activeCompetition.name);
      setSlug(activeCompetition.slug);
      setType(activeCompetition.type);
    }
    if (activeSeason) {
      setStatus(activeSeason.status);
    }
  }, [activeCompetition, activeSeason]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompetition || !activeSeason) return;
    
    setSaving(true);
    try {
      // Update Competition
      const { error: compErr } = await supabase
        .from('competitions')
        .update({ name, slug, type })
        .eq('id', activeCompetition.id);
      
      if (compErr) throw compErr;

      // Update Season Status
      const { error: seasonErr } = await supabase
        .from('seasons')
        .update({ status })
        .eq('id', activeSeason.id);

      if (seasonErr) throw seasonErr;

      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading) return <div style={{ padding: '5rem', textAlign: 'center' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><Settings /> CONFIGURAÇÕES DO CAMPEONATO</h1>
        <p style={{ color: 'var(--text-muted)' }}>Personalize a identidade e as regras desta competição específica.</p>
      </div>

      <form onSubmit={handleSave} style={{ maxWidth: '800px' }}>
        <div className="grid-2" style={{ marginBottom: '2rem' }}>
          <div className="premium-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layout size={18} color="var(--primary-color)" /> IDENTIDADE VISUAL
            </h3>
            
            <div className="form-group">
              <label>Nome Público</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label>Slug (URL)</label>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Tipo de Competição</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="league">Liga (Pontos Corridos)</option>
                <option value="knockout">Mata-Mata</option>
                <option value="hybrid">Híbrido (Grupos + Mata-Mata)</option>
              </select>
            </div>
          </div>

          <div className="premium-card" style={{ padding: '2rem' }}>
            <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--success)" /> STATUS & REGRAS
            </h3>

            <div className="form-group">
              <label>Status da Temporada ({activeSeason?.year})</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="draft">Rascunho (Não visível)</option>
                <option value="active">Ativo (Em andamento)</option>
                <option value="finished">Finalizado (Histórico)</option>
              </select>
            </div>

            <div style={{ background: 'var(--surface-alt)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                  <Palette size={16} color="var(--primary-color)" /> CUSTOMIZAÇÃO DE CORES
               </div>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Em breve: Você poderá definir a cor primária deste campeonato para que todo o site mude de cor ao ser acessado.
               </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
           <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.8rem 2.5rem' }}>
              {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />} Salvar Configurações
           </button>
        </div>
      </form>

      {/* DANGER ZONE */}
      <div className="premium-card" style={{ marginTop: '4rem', padding: '2rem', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.02)' }}>
         <h3 style={{ color: 'var(--error)', fontWeight: 950, marginBottom: '0.5rem' }}>ZONA DE PERIGO</h3>
         <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Ações irreversíveis que afetam permanentemente os dados desta competição.
         </p>
         <button className="btn" style={{ background: 'var(--error)', color: 'white' }}>Arquivar Competição</button>
      </div>
    </div>
  );
}
