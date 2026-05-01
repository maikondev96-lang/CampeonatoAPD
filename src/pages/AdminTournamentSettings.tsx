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
      <div className="admin-header-app" style={{ marginBottom: '1.5rem' }}>
        <div className="admin-header-title">
          <Settings size={18} />
          <h1>CONFIGURAÇÕES</h1>
        </div>
        <p className="admin-header-subtitle">Identidade e regras da competição.</p>
      </div>

      <form onSubmit={handleSave} style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          
          <div className="fs-comps-section">
            <div className="fs-section-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layout size={12} color="var(--primary-dark)" /> IDENTIDADE VISUAL
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>NOME PÚBLICO</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }} />
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>SLUG (URL)</label>
                <input type="text" value={slug} onChange={e => setSlug(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }} />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>TIPO DE COMPETIÇÃO</label>
                <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }}>
                  <option value="league">Liga (Pontos Corridos)</option>
                  <option value="knockout">Mata-Mata</option>
                  <option value="hybrid">Híbrido (Grupos + Mata-Mata)</option>
                  <option value="league_knockout">Pontos Corridos + Mata-Mata</option>
                </select>
              </div>
            </div>
          </div>

          <div className="fs-comps-section">
            <div className="fs-section-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={12} color="var(--primary-dark)" /> STATUS & REGRAS
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>STATUS DA TEMPORADA ({activeSeason?.year})</label>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '10px', fontSize: '0.9rem' }}>
                  <option value="draft">Rascunho (Não visível)</option>
                  <option value="active">Ativo (Em andamento)</option>
                  <option value="finished">Finalizado (Histórico)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="fs-comps-section">
            <div className="fs-section-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={12} color="var(--primary-dark)" /> PERSONALIZAÇÃO DE TEMA
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div className="form-group" style={{ margin: 0 }}>
                 <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>COR PRIMÁRIA (IDENTIDADE)</label>
                 <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                   <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: '2px', cursor: 'pointer', borderRadius: '4px' }}
                   />
                   <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={e => setPrimaryColor(e.target.value)}
                    placeholder="#000000"
                    style={{ flex: 1, fontFamily: 'monospace', padding: '10px', fontSize: '0.9rem' }}
                   />
                 </div>
               </div>

               <div className="form-group" style={{ margin: 0 }}>
                 <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>URL DO LOGO DO CAMPEONATO</label>
                 <input 
                   type="text" 
                   value={logoUrl} 
                   onChange={e => setLogoUrl(e.target.value)} 
                   placeholder="https://exemplo.com/logo.png"
                   style={{ padding: '10px', fontSize: '0.9rem' }}
                 />
               </div>

               <div className="form-group" style={{ margin: 0 }}>
                 <label style={{ fontSize: '0.7rem', fontWeight: 800 }}>URL DO BANNER DE FUNDO</label>
                 <input 
                   type="text" 
                   value={bannerUrl} 
                   onChange={e => setBannerUrl(e.target.value)} 
                   placeholder="https://exemplo.com/banner.jpg"
                   style={{ padding: '10px', fontSize: '0.9rem' }}
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
      <div className="fs-comps-section" style={{ marginTop: '2rem', border: '1px solid var(--error)' }}>
         <div className="fs-section-header" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}>ZONA DE PERIGO</div>
         <div style={{ padding: '16px' }}>
           <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              A exclusão de um campeonato é <strong>definitiva e irreversível</strong>. <br />
              Todos os jogos, estatísticas e elencos serão removidos permanentemente.
           </p>

           <button 
             type="button"
             onClick={handleDelete}
             disabled={deleting}
             className="btn" 
             style={{ width: '100%', background: 'var(--error)', color: 'white', padding: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px' }}
           >
              {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              EXCLUIR DEFINITIVAMENTE
           </button>
         </div>
      </div>
    </div>
  );
}
