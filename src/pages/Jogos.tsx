import React from 'react';
import { supabase } from '../supabaseClient';
import { Match, Stage, STAGE_TYPE_LABELS } from '../types';
import { Calendar, Loader2, Target, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useSeasonContext } from '../components/SeasonContext';
import { useQuery } from '@tanstack/react-query';
import { QueryError } from '../components/QueryError';

const Jogos = () => {
  const { slug, year } = useParams<{ slug: string; year: string }>();
  const { season, loading: ctxLoading } = useSeasonContext();

  // TanStack Query: queryKey inclui season.id → reexecuta automaticamente ao trocar temporada
  const { data, isLoading: queryLoading, isError, refetch } = useQuery({
    queryKey: ['jogos', season?.id],
    queryFn: async () => {
      const [stagesRes, matchesRes] = await Promise.all([
        supabase
          .from('stages')
          .select('*')
          .eq('season_id', season!.id)
          .order('order_index'),
        supabase
          .from('matches')
          .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(id, name, type, order_index)')
          .eq('season_id', season!.id),
      ]);

      const sortedMatches = [...(matchesRes.data || [])].sort((a: any, b: any) => {
        const orderA = a.stage?.order_index ?? 999;
        const orderB = b.stage?.order_index ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        if (a.round !== b.round) return (a.round || 0) - (b.round || 0);
        return (a.date || '9999').localeCompare(b.date || '9999');
      });

      return { stages: stagesRes.data ?? [], matches: sortedMatches };
    },
    enabled: !!season?.id,
    staleTime: 1000 * 60 * 5,
  });

  const jogos: Match[] = data?.matches ?? [];
  const stages: Stage[] = data?.stages ?? [];

  if (isError && !data) return <QueryError message="Erro ao carregar os jogos." onRetry={refetch} />;
  if (queryLoading || ctxLoading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" color="var(--primary-color)" size={32} /></div>;

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
                      className={`fs-match-row ${isLive ? 'is-live' : ''} ${isFinished ? 'is-finished' : ''}`}
                    >
                      {/* LADO ESQUERDO: Data/Status */}
                      <div className="fs-match-time">
                        {isFinished ? (
                          <span className="fs-status finished">Fim</span>
                        ) : isLive ? (
                          <span className="fs-status live">Ao Vivo</span>
                        ) : (
                          <span className="fs-time">{jogo.time?.slice(0, 5) || 'A Def.'}</span>
                        )}
                        {!isFinished && !isLive && <span className="fs-date">{jogo.date?.split('-').reverse().slice(0, 2).join('/')}</span>}
                      </div>

                      {/* CENTRO: Times Empilhados */}
                      <div className="fs-match-teams">
                        <div className="fs-team">
                          {jogo.home_team?.logo_url ? (
                            <img src={jogo.home_team.logo_url} alt="" className="fs-team-logo" />
                          ) : (
                            <div className="fs-team-logo-placeholder">?</div>
                          )}
                          <span className={`fs-team-name ${!jogo.home_team ? 'placeholder' : ''} ${homeWin ? 'winner' : ''}`}>{homeName}</span>
                          <span className={`fs-team-score ${homeWin ? 'winner' : ''}`}>{isFinished || isLive ? jogo.home_score : '-'}</span>
                        </div>
                        <div className="fs-team mt-1">
                          {jogo.away_team?.logo_url ? (
                            <img src={jogo.away_team.logo_url} alt="" className="fs-team-logo" />
                          ) : (
                            <div className="fs-team-logo-placeholder">?</div>
                          )}
                          <span className={`fs-team-name ${!jogo.away_team ? 'placeholder' : ''} ${awayWin ? 'winner' : ''}`}>{awayName}</span>
                          <span className={`fs-team-score ${awayWin ? 'winner' : ''}`}>{isFinished || isLive ? jogo.away_score : '-'}</span>
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
        .jogos-header { margin-bottom: 2rem; }
        .header-badge { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; background: var(--surface-alt); border-radius: 4px; color: var(--primary-color); font-size: 0.65rem; font-weight: 800; letter-spacing: 1px; margin-bottom: 0.5rem; border: 1px solid var(--border-color); }
        .main-title { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin: 0; letter-spacing: -0.5px; }

        .jogos-grid-fluid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .round-section { display: flex; flex-direction: column; }

        .round-pill-header { display: flex; align-items: center; margin-bottom: 0; }
        .pill-content {
          width: 100%;
          display: flex; align-items: center; gap: 8px;
          background: var(--secondary-color); color: #0d1e25;
          padding: 8px 12px; border-radius: 0;
          font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
        }
        .round-pill-header.knockout .pill-content {
          background: #fdf3c7;
        }

        .matches-column-list { 
          display: flex; 
          flex-direction: column; 
          background: var(--card-bg);
        }

        .fs-match-row {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-color);
          text-decoration: none;
          color: inherit;
          transition: background 0.15s;
          cursor: pointer;
        }
        .fs-match-row:hover { background: var(--card-hover); }
        .fs-match-row:last-child { border-bottom: none; }

        .fs-match-time {
          width: 50px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-right: 1px solid var(--border-color);
          padding-right: 12px;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .fs-time { font-size: 0.75rem; font-weight: 500; color: var(--text-main); }
        .fs-date { font-size: 0.65rem; color: var(--text-muted); margin-top: 2px; }
        .fs-status { font-size: 0.7rem; font-weight: 700; }
        .fs-status.finished { color: var(--text-muted); }
        .fs-status.live { color: var(--accent-color); animation: blink 1.5s infinite; }

        .fs-match-teams {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .fs-team {
          display: flex;
          align-items: center;
          width: 100%;
        }
        .fs-team.mt-1 { margin-top: 6px; }

        .fs-team-logo { width: 18px; height: 18px; object-fit: contain; margin-right: 8px; }
        .fs-team-logo-placeholder { width: 18px; height: 18px; border-radius: 50%; background: var(--surface-alt); border: 1px dashed var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--text-muted); margin-right: 8px; }

        .fs-team-name { flex: 1; font-size: 0.85rem; font-weight: 500; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fs-team-name.winner { font-weight: 800; }
        .fs-team-name.placeholder { color: var(--text-muted); font-style: italic; font-weight: 400; font-size: 0.75rem; }

        .fs-team-score { font-size: 0.9rem; font-weight: 500; color: var(--text-main); margin-left: 8px; }
        .fs-team-score.winner { font-weight: 800; color: var(--primary-dark); }

        .empty-state { text-align: center; padding: 4rem; background: var(--card-bg); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); }
        .empty-state p { font-weight: 500; color: var(--text-muted); font-size: 0.85rem; }

        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        @media (max-width: 900px) {
          .page-fluid { padding: 0; padding-bottom: 24px; }
          .jogos-header { padding: 16px; margin-bottom: 0; background: white; }
          .jogos-grid-fluid { gap: 0; }
          .round-pill-header .pill-content { border-left: none; border-right: none; }
        }
      `}</style>
    </div>
  );
};

export default Jogos;
