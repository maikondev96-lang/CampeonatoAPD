import React, { useState, useEffect } from 'react';
import { useAdminContext } from '../components/AdminContext';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, Loader2, Image as ImageIcon, Layout, ShieldCheck, Palette, AlertTriangle, Trash2 } from 'lucide-react';

export default function AdminTournamentSettings() {
  const { activeCompetition, activeSeason, loading: ctxLoading } = useAdminContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#16a34a');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  useEffect(() => {
    if (activeCompetition) {
      setName(activeCompetition.name);
      setSlug(activeCompetition.slug);
      setType(activeCompetition.type);
      const settings = activeCompetition.settings_json || {};
      setPrimaryColor(settings.primary_color || '#16a34a');
      setLogoUrl(settings.logo_url || '');
      setBannerUrl(settings.banner_url || '');
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
        .update({ 
          name, 
          slug, 
          type,
          settings_json: {
            ...(activeCompetition.settings_json || {}),
            primary_color: primaryColor,
            logo_url: logoUrl,
            banner_url: bannerUrl
          }
        })
        .eq('id', activeCompetition.id);
      
      if (compErr) throw compErr;

      // Update Season Status
      const { error: seasonErr } = await supabase
        .from('seasons')
        .update({ status })
        .eq('id', activeSeason.id);

      if (seasonErr) throw seasonErr;

      // Invalida cache para refletir no público
      const { bumpTableVersion } = await import('../utils/smartCache');
      await bumpTableVersion('competitions');

      alert('Configurações salvas com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCompetition) return;
    
    const confirmName = prompt(`⚠️ AÇÃO IRREVERSÍVEL!\n\nPara excluir o campeonato "${activeCompetition.name}" e TODOS os seus dados (jogos, times, tabelas), digite o nome do campeonato abaixo:`);
    
    if (confirmName !== activeCompetition.name) {
      if (confirmName !== null) alert('Nome incorreto. Exclusão cancelada.');
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .delete()
        .eq('id', activeCompetition.id);

      if (error) throw error;

      alert('✅ Campeonato excluído com sucesso.');
      navigate('/admin');
      window.location.reload(); // Forçar refresh do context
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setDeleting(false);
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
                <option value="league_knockout">Pontos Corridos + Mata-Mata</option>
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

            <div style={{ background: 'var(--surface-alt)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginTop: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: 900, marginBottom: '1.2rem' }}>
                  <Palette size={18} color="var(--primary-color)" /> PERSONALIZAÇÃO DE TEMA
               </div>
               
               <div className="form-group">
                 <label>Cor Primária (Identidade)</label>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                   <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ width: '50px', height: '40px', padding: '2px', cursor: 'pointer' }}
                   />
                   <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    style={{ flex: 1, fontFamily: 'monospace' }}
                   />
                 </div>
                 <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                   Esta cor será usada em botões, links e destaques em todo o site deste campeonato.
                 </p>
               </div>

               <div className="form-group" style={{ marginTop: '1.5rem' }}>
                 <label>URL do Logo do Campeonato</label>
                 <input 
                   type="text" 
                   value={logoUrl} 
                   onChange={e => setLogoUrl(e.target.value)} 
                   placeholder="https://exemplo.com/logo.png"
                 />
               </div>

               <div className="form-group" style={{ marginTop: '1rem' }}>
                 <label>URL do Banner de Fundo</label>
                 <input 
                   type="text" 
                   value={bannerUrl} 
                   onChange={e => setBannerUrl(e.target.value)} 
                   placeholder="https://exemplo.com/banner.jpg"
                 />
               </div>
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
      <div className="premium-card" style={{ 
          marginTop: '4rem', 
          padding: '2.5rem', 
          border: '1px solid rgba(239,68,68,0.3)', 
          background: 'rgba(239,68,68,0.02)',
          borderRadius: '24px'
      }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
            <AlertTriangle size={24} color="var(--error)" />
            <h3 style={{ color: 'var(--error)', fontWeight: 950, margin: 0, fontSize: '1.2rem' }}>ZONA DE PERIGO</h3>
         </div>
         
         <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            A exclusão de um campeonato é <strong>definitiva e irreversível</strong>. <br />
            Todos os jogos, estatísticas, elencos e configurações associadas a esta competição serão removidos permanentemente do sistema.
         </p>

         <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn" 
              style={{ background: 'var(--error)', color: 'white', padding: '0.8rem 2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
               {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
               EXCLUIR CAMPEONATO DEFINITIVAMENTE
            </button>
         </div>
      </div>
    </div>
  );
}
