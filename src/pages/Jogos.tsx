import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Match, Stage, STAGE_TYPE_LABELS } from '../types';
import { Calendar, Loader2, Target, Trophy, Clock } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useSeasonContext } from '../components/SeasonContext';
import { getSmartData } from '../utils/smartCache';

const Jogos = () => {
  const { slug, year } = useParams<{ slug: string; year: string }>();
  const { season, loading: ctxLoading } = useSeasonContext();
  const [jogos, setJogos] = useState<Match[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (season) fetchJogos();
  }, [season]);

  const fetchJogos = async () => {
    if (!season) return;
    setLoading(true);

    try {
      const data = await getSmartData(`jogos_${season.id}`, async () => {
        const { data: stagesData } = await supabase
          .from('stages')
          .select('*')
          .eq('season_id', season.id)
          .order('order_index');
        
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(id, name, type, order_index)')
          .eq('season_id', season.id);

        const sortedMatches = [...(matchesData || [])].sort((a: any, b: any) => {
          const orderA = a.stage?.order_index ?? 999;
          const orderB = b.stage?.order_index ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          if (a.round !== b.round) return (a.round || 0) - (b.round || 0);
          return (a.date || '9999').localeCompare(b.date || '9999');
        });

        return { stages: stagesData || [], matches: sortedMatches };
      });

      setStages(data.stages);
      setJogos(data.matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || ctxLoading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" color="var(--primary-color)" size={32} /></div>;

  const groups: { key: string; label: string; matches: Match[]; isKnockout: boolean }[] = [];
  const groupStageIds = stages.filter(s => s.type === 'group').map(s => s.id);

  const groupMatches = jogos.filter(j => j.stage_id && groupStageIds.includes(j.stage_id));
  const roundMap: Record<number, Match[]> = {};
  groupMatches.forEach(m => {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  });
  Object.entries(roundMap).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([round, matches]) => {
    groups.push({ key: `round-${round}`, label: `RODADA ${round}`, matches, isKnockout: false });
  });

  const knockoutMatches = jogos.filter(j => j.stage_id && !groupStageIds.includes(j.stage_id));
  const stageMap: Record<string, Match[]> = {};
  knockoutMatches.forEach(m => {
    if (!m.stage_id) return;
    if (!stageMap[m.stage_id]) stageMap[m.stage_id] = [];
    stageMap[m.stage_id].push(m);
  });
  stages.filter(s => s.type !== 'group').forEach(s => {
    if (stageMap[s.id]) {
      groups.push({ key: `stage-${s.id}`, label: (STAGE_TYPE_LABELS[s.type] || s.name).toUpperCase(), matches: stageMap[s.id], isKnockout: true });
    }
  });

  return (
    <div className="page-fluid animate-fade">
      <div className="jogos-header">
        <div className="header-badge"><Calendar size={14}/><span>TEMPORADA {year}</span></div>
        <h1 className="main-title">Calendário de Jogos</h1>
      </div>

      {jogos.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum jogo cadastrado nesta temporada.</p>
        </div>
      ) : (
        <div className="jogos-grid-fluid">
          {groups.map(({ key, label, matches, isKnockout }) => (
            <div key={key} className="round-section">
              <div className={`round-pill-header ${isKnockout ? 'knockout' : ''}`}>
                <div className="pill-content">
                   {isKnockout ? <Trophy size={14}/> : <Target size={14}/>}
                   <span>{label}</span>
                </div>
              </div>
              
              <div className="matches-column-list">
                {matches.map((jogo, idx) => {
                  const isLive = jogo.status === 'ao_vivo';
                  const isFinished = jogo.status === 'finalizado';
                  const homeWin = isFinished && (jogo.home_score || 0) > (jogo.away_score || 0);
                  const awayWin = isFinished && (jogo.away_score || 0) > (jogo.home_score || 0);
                  
                  const stageType = (jogo as any).stage?.type || '';
                  const getPlaceholder = (isHome: boolean) => {
                    if (stageType === 'semi') {
                      if (idx === 0) return isHome ? '1º Colocado' : '4º Colocado';
                      return isHome ? '2º Colocado' : '3º Colocado';
                    }
                    if (stageType === 'third_place') return isHome ? 'Semi 1 (Perdedor)' : 'Semi 2 (Perdedor)';
                    if (stageType === 'final') return isHome ? 'Semi 1 (Vencedor)' : 'Semi 2 (Vencedor)';
                    return 'A DEFINIR';
                  };

                  const homeName = jogo.home_team?.name || getPlaceholder(true);
                  const awayName = jogo.away_team?.name || getPlaceholder(false);
                  
                  return (
                    <Link 
                      key={jogo.id} 
                      to={`/competitions/${slug}/${year}/jogos/${jogo.id}`}
                      className={`premium-match-card ${isLive ? 'is-live' : ''} ${isFinished ? 'is-finished' : ''}`}
                    >
                      <div className="p-card-body">
                        {/* TIME CASA */}
                        <div className="p-team home">
                          <span className={`p-team-name ${!jogo.home_team ? 'placeholder' : ''}`}>{homeName}</span>
                          {jogo.home_team?.logo_url ? (
                            <img src={jogo.home_team.logo_url} alt="" className="p-shield" />
                          ) : (
                            <div className="p-empty-logo">?</div>
                          )}
                        </div>

                        {/* ÁREA CENTRAL PLACAR */}
                        <div className="p-score-area">
                          {isFinished || isLive ? (
                            <div className="p-score-display">
                              <span className={`p-num ${homeWin ? 'winner' : ''}`}>{jogo.home_score}</span>
                              <span className="p-sep">-</span>
                              <span className={`p-num ${awayWin ? 'winner' : ''}`}>{jogo.away_score}</span>
                            </div>
                          ) : (
                            <div className="p-vs-box">VS</div>
                          )}
                          
                          <div className="p-meta-info">
                            {isFinished ? (
                              <span className="p-status-tag finished">ENCERRADO</span>
                            ) : isLive ? (
                              <span className="p-status-tag live">AO VIVO</span>
                            ) : (
                              <div className="p-datetime">
                                <span className="p-date">{jogo.date?.split('-').reverse().slice(0, 2).join('/')}</span>
                                <span className="p-hour">{jogo.time?.slice(0, 5) || 'A DEF.'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* TIME FORA */}
                        <div className="p-team away">
                          {jogo.away_team?.logo_url ? (
                            <img src={jogo.away_team.logo_url} alt="" className="p-shield" />
                          ) : (
                            <div className="p-empty-logo">?</div>
                          )}
                          <span className={`p-team-name ${!jogo.away_team ? 'placeholder' : ''}`}>{awayName}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .jogos-header { margin-bottom: 3rem; }
        .header-badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; background: var(--surface-alt); border-radius: 50px; color: var(--primary-color); font-size: 0.7rem; font-weight: 950; letter-spacing: 1px; margin-bottom: 1rem; border: 1px solid var(--border-color); }
        .main-title { font-size: 2.5rem; font-weight: 950; color: var(--text-main); margin: 0; letter-spacing: -1.5px; }

        .jogos-grid-fluid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
          gap: 3rem;
          align-items: start;
        }

        .round-section { display: flex; flex-direction: column; gap: 1.5rem; }

        .round-pill-header { display: flex; align-items: center; }
        .pill-content {
          display: flex; align-items: center; gap: 10px;
          background: #f1f5f9; color: #475569;
          padding: 8px 20px; border-radius: 50px;
          font-size: 0.75rem; font-weight: 950; letter-spacing: 1.5px;
          border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.02);
        }
        .round-pill-header.knockout .pill-content {
          background: #fefce8; color: #854d0e; border-color: #fef08a;
        }

        .matches-column-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .premium-match-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 1.25rem 1.5rem;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .premium-match-card:hover {
          transform: translateY(-4px) scale(1.01);
          border-color: var(--primary-color);
          box-shadow: 0 12px 30px rgba(0,0,0,0.06);
        }
        .premium-match-card.is-live { border-color: var(--error); border-width: 2px; }

        .p-card-body {
          display: grid;
          grid-template-columns: 1fr 120px 1fr;
          align-items: center;
          gap: 1rem;
        }

        .p-team { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .p-team.home { justify-content: flex-end; text-align: right; }
        .p-team.away { justify-content: flex-start; text-align: left; }

        .p-shield { width: 36px; height: 36px; object-fit: contain; flex-shrink: 0; }
        .p-team-name { font-size: 0.95rem; font-weight: 850; color: var(--text-main); line-height: 1.2; }
        .p-team-name.placeholder { color: var(--text-muted); opacity: 0.5; font-style: italic; font-weight: 700; font-size: 0.8rem; }

        .p-score-area { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50px; }
        .p-score-display { display: flex; align-items: center; gap: 12px; }
        .p-num { font-size: 1.75rem; font-weight: 950; color: var(--text-muted); opacity: 0.5; }
        .p-num.winner { color: var(--text-main); opacity: 1; }
        .p-sep { color: var(--border-color); font-weight: 300; font-size: 1rem; }

        .p-vs-box {
          font-size: 0.75rem; font-weight: 950; color: var(--text-muted); opacity: 0.25;
          padding: 4px 12px; background: var(--surface-alt); border-radius: 8px; letter-spacing: 2px;
        }

        .p-meta-info { margin-top: 6px; }
        .p-status-tag { font-size: 0.6rem; font-weight: 950; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px; }
        .p-status-tag.finished { background: #f1f5f9; color: #64748b; }
        .p-status-tag.live { background: #fee2e2; color: #ef4444; animation: blink 1.2s infinite; }

        .p-datetime { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .p-date { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; }
        .p-hour { font-size: 0.8rem; font-weight: 950; color: var(--primary-color); }

        .p-empty-logo { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-alt); border: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: var(--text-muted); }

        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        .empty-state { text-align: center; padding: 6rem; background: var(--card-bg); border-radius: 24px; border: 1px dashed var(--border-color); }
        .empty-state p { font-weight: 900; color: var(--text-muted); }

        @media (max-width: 1400px) {
          .jogos-grid-fluid { grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 2rem; }
        }

        @media (max-width: 900px) {
          .jogos-grid-fluid { grid-template-columns: 1fr; }
          .main-title { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
};

export default Jogos;
