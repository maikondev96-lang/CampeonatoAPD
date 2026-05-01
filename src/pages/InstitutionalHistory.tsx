import React from 'react';
import { History as HistoryIcon, Star, Trophy, Users, Flag, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getSmartData, useSmartData } from '../utils/smartCache';

// Fallback hardcoded (caso a tabela não exista ou esteja vazia)
const fallbackTimeline = [
  { year: '2026', title: 'O Portal Profissional', description: 'Refatoração completa para o modelo institucional GE.', icon_name: 'HistoryIcon', color: 'var(--primary-color)' },
  { year: '2025', title: 'Associação APD', description: 'Formalização da Associação Peladeiros de Domingo.', icon_name: 'Users', color: '#22c55e' },
  { year: '2024', title: 'Expansão Tecnológica', description: 'Lançamento da primeira versão do portal web.', icon_name: 'Star', color: '#3b82f6' },
  { year: '2023', title: 'Torneio Oficial', description: 'A primeira Copa APD com 8 equipes.', icon_name: 'Trophy', color: '#eab308' },
  { year: '2022', title: 'A Semente', description: 'Início das peladas de domingo.', icon_name: 'Flag', color: '#64748b' }
];

const iconMap: any = { 'HistoryIcon': HistoryIcon, 'Star': Star, 'Trophy': Trophy, 'Users': Users, 'Flag': Flag };

export default function InstitutionalHistory() {
  const { data: historyData, loading: cacheLoading } = useSmartData('history_full', async () => {
    // 1. Busca Campeões Automáticos
    const { data: autoChamps } = await supabase
      .from('seasons')
      .select('*, competition:competitions(name), champion_team:teams!champion_team_id(*), runner_up_team:teams!runner_up_team_id(*)')
      .eq('status', 'finished');
    
    // 2. Busca Campeões Manuais
    const { data: manualChamps } = await supabase.from('hall_of_fame').select('*');

    // 3. Busca Timeline
    const { data: timeData } = await supabase.from('history_timeline').select('*').order('year', { ascending: false });

    const normalizedAuto = (autoChamps || []).map(s => ({
      id: s.id,
      year: s.year,
      competition_name: s.competition?.name,
      champion_name: s.champion_team?.name,
      champion_logo: s.champion_team?.logo_url,
      squad_photo: s.champion_team?.squad_photo_url,
      runner_up_name: s.runner_up_team?.name,
      runner_up_logo: s.runner_up_team?.logo_url,
      is_auto: true
    }));

    const normalizedManual = (manualChamps || []).map(h => ({
      id: h.id,
      year: parseInt(h.year),
      competition_name: h.competition_name,
      champion_name: h.champion_name,
      champion_logo: h.champion_logo_url,
      squad_photo: h.squad_photo_url,
      runner_up_name: h.runner_up_name,
      runner_up_logo: h.runner_up_logo_url,
      is_auto: false
    }));

    return {
      champions: [...normalizedAuto, ...normalizedManual].sort((a, b) => b.year - a.year),
      timeline: timeData && timeData.length > 0 ? timeData : fallbackTimeline
    };
  });

  const allChampions = historyData?.champions || [];
  const timeline = historyData?.timeline || fallbackTimeline;
  const loading = !historyData && cacheLoading;

  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="section-title" style={{ justifyContent: 'center', fontSize: '2.5rem' }}>
           <HistoryIcon size={32} /> NOSSA HISTÓRIA
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>A trajetória de quem ama o futebol e acredita na organização.</p>
      </div>

      {/* HALL OF FAME — TOPO */}
      <div style={{ marginBottom: '8rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontWeight: 950, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
            <Trophy size={32} color="#eab308" /> GALERIA DE CAMPEÕES
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>O hall da fama eterno da APD.</p>
        </div>

        {loading && allChampions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {allChampions.map(item => (
              <div key={item.id} className="premium-card champion-card-heavy" style={{ padding: 0, border: '2px solid #eab308', background: 'var(--card-bg)', overflow: 'hidden' }}>
                {item.squad_photo ? (
                  <div style={{ width: '100%', height: '200px', position: 'relative' }}>
                    <img src={item.squad_photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Squad" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
                    <div style={{ position: 'absolute', bottom: '15px', left: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                       <img src={item.champion_logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.champion_name}`} style={{ width: '50px', height: '50px', objectFit: 'contain', background: 'white', borderRadius: '50%', padding: '5px' }} />
                       <div>
                         <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#eab308' }}>CAMPEÃO {item.year}</div>
                         <h3 style={{ fontSize: '1.25rem', fontWeight: 950, color: 'white', margin: 0 }}>{item.champion_name}</h3>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 950, color: '#854d0e' }}>{item.year}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#b45309', background: '#fef08a', padding: '4px 12px', borderRadius: '20px' }}>
                        {item.competition_name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                       <div style={{ position: 'relative' }}>
                          <img src={item.champion_logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${item.champion_name}`} style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                          <div style={{ position: 'absolute', bottom: -5, right: -5, background: '#eab308', borderRadius: '50%', padding: '4px' }}>
                            <Trophy size={14} color="white" />
                          </div>
                       </div>
                       <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>CAMPEÃO</div>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-main)', margin: 0 }}>{item.champion_name}</h3>
                       </div>
                    </div>
                  </div>
                )}

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>{item.competition_name}</div>
                  {item.runner_up_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src={item.runner_up_logo} style={{ width: '30px', height: '30px', objectFit: 'contain', opacity: 0.6 }} />
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Vice:</span> {item.runner_up_name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontWeight: 950, fontSize: '2rem' }}>LINHA DO TEMPO</h2>
          <p style={{ color: 'var(--text-muted)' }}>Nossa evolução ano a ano</p>
        </div>

        {/* Linha Central */}
        <div style={{ position: 'absolute', left: '50%', top: '100px', bottom: 0, width: '2px', background: 'var(--border-color)', transform: 'translateX(-50%)' }} />

        {timeline.map((item, idx) => {
          const Icon = iconMap[item.icon_name] || Flag;
          return (
            <div key={item.id || item.year} style={{ display: 'flex', justifyContent: idx % 2 === 0 ? 'flex-start' : 'flex-end', width: '100%', marginBottom: '4rem', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '50%', top: '20px', width: '16px', height: '16px', background: item.color, borderRadius: '50%', transform: 'translateX(-50%)', border: '4px solid var(--bg-color)', zIndex: 2 }} />
              <div className="premium-card" style={{ width: '45%', padding: '2rem', textAlign: idx % 2 === 0 ? 'right' : 'left', position: 'relative' }}>
                <div style={{ fontSize: '2rem', fontWeight: 950, color: item.color, marginBottom: '0.5rem', fontFamily: 'monospace' }}>{item.year}</div>
                <h3 style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: idx % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                   {idx % 2 !== 0 && <Icon size={20} color={item.color} />} {item.title} {idx % 2 === 0 && <Icon size={20} color={item.color} />}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{item.description || item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
