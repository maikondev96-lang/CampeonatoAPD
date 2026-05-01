import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAdminContext } from '../components/AdminContext';
import { 
  Trophy, Loader2, ArrowRight, Settings, 
  Layers, Shuffle, Calendar, LayoutGrid
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminFases() {
  const { activeCompetition, activeSeason, loading: ctxLoading } = useAdminContext();
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeSeason) fetchStages();
  }, [activeSeason]);

  const fetchStages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stages')
      .select('*')
      .eq('season_id', activeSeason?.id)
      .order('order_index', { ascending: true });
    
    if (data) setStages(data);
    setLoading(false);
  };

  if (ctxLoading || loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  const isGroups = activeCompetition?.type === 'hybrid' || activeCompetition?.type === 'groups_knockout';
  const isLeague = activeCompetition?.type === 'league' || activeCompetition?.type === 'league_knockout';

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 className="section-title" style={{ margin: 0 }}><Trophy /> GESTÃO DE FASES</h1>
        <p style={{ color: 'var(--text-muted)' }}>Configure e gerencie as etapas do campeonato.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* FASE 1: CLASSIFICATÓRIA */}
        <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
               <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary-color)', textTransform: 'uppercase', marginBottom: '4px' }}>Fase 1</div>
               <h2 style={{ fontWeight: 950, fontSize: '1.4rem' }}>{isGroups ? 'Fase de Grupos' : 'Pontos Corridos'}</h2>
            </div>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary-color)', padding: '8px', borderRadius: '12px' }}>
              {isGroups ? <LayoutGrid size={24} /> : <Layers size={24} />}
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {isGroups 
              ? 'Os times são divididos em grupos e jogam entre si dentro de cada grupo.' 
              : 'Todos os times jogam entre si em turno único ou turno e returno.'}
          </p>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isGroups && (
              <Link to={`/admin/${activeCompetition?.slug}/${activeSeason?.year}/sorteio`} className="btn btn-secondary" style={{ justifyContent: 'space-between' }}>
                Gerenciar Grupos / Sorteio <Shuffle size={16} />
              </Link>
            )}
            <Link to={`/admin/${activeCompetition?.slug}/${activeSeason?.year}/jogos`} className="btn btn-primary" style={{ justifyContent: 'space-between' }}>
              Gerenciar Jogos e Rodadas <Calendar size={16} />
            </Link>
          </div>
        </div>

        {/* FASE 2: MATA-MATA (Se aplicável) */}
        {(activeCompetition?.type !== 'league') && (
          <div className="premium-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                 <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '4px' }}>Fase 2</div>
                 <h2 style={{ fontWeight: 950, fontSize: '1.4rem' }}>Mata-Mata</h2>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '8px', borderRadius: '12px' }}>
                <Trophy size={24} />
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Fase eliminatória onde os melhores classificados disputam o título. Gerencie o chaveamento, semifinais e a grande final.
            </p>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <button className="btn btn-secondary" style={{ justifyContent: 'space-between', opacity: 0.7, cursor: 'not-allowed' }}>
                Configurar Chaveamento (Em breve) <ArrowRight size={16} />
              </button>
              <Link to={`/admin/${activeCompetition?.slug}/${activeSeason?.year}/jogos`} className="btn btn-primary" style={{ justifyContent: 'space-between' }}>
                Gerenciar Jogos do Mata-Mata <Calendar size={16} />
              </Link>
            </div>
          </div>
        )}

        {/* CONFIGURAÇÕES GERAIS */}
        <div className="premium-card" style={{ padding: '2rem', background: 'var(--surface-alt)', borderStyle: 'dashed' }}>
           <h3 style={{ fontWeight: 950, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} /> Estrutura do Torneio
           </h3>
           <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Atualmente o campeonato está configurado como <strong>{activeCompetition?.type ? (activeCompetition.type === 'league_knockout' ? 'Pontos Corridos + Mata-Mata' : activeCompetition.type) : 'Não definido'}</strong>.
           </p>
           <Link to={`/admin/${activeCompetition?.slug}/${activeSeason?.year}/settings`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Alterar Formato da Competição
           </Link>
        </div>
      </div>
    </div>
  );
}
