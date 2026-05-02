import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Match } from '../types';
import { Trophy, Star, Calendar, Clock } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useSeasonContext } from '../components/SeasonContext';
import { useQuery } from '@tanstack/react-query';
import { useQueryEngine } from '../query/useQueryEngine';
import { QueryView } from '../query/QueryView';

const Fases = () => {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [activeTab, setActiveTab] = useState<'oitavas' | 'quartas' | 'semis' | 'final'>('final');

  // 1. DATA LAYER
  const query = useQuery({
    queryKey: ['fases', season?.id],
    queryFn: async () => {
      if (!season) return null;
      const { data, error } = await supabase.from('matches')
        .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(*)')
        .eq('season_id', season.id)
        .order('created_at');
      
      if (error) throw error;
      const knockoutMatches = (data || []).filter((m: any) => m.stage && m.stage.type !== 'group');
      return knockoutMatches as Match[];
    },
    enabled: !!season
  });

  const { state, data: matches, refetch } = useQueryEngine(query, ctxLoading);

  // Auto-switch tab based on latest available stage
  useEffect(() => {
    if (matches && matches.length > 0) {
      if (matches.some(m => m.stage?.type === 'final')) setActiveTab('final');
      else if (matches.some(m => m.stage?.type === 'semi')) setActiveTab('semis');
      else if (matches.some(m => m.stage?.type === 'quarter')) setActiveTab('quartas');
      else if (matches.some(m => m.stage?.type === 'round_of_16')) setActiveTab('oitavas');
    }
  }, [matches]);

  const BracketCard = ({ match, placeholderHome, placeholderAway, type }: { match?: Match, placeholderHome: string, placeholderAway: string, type: 'oitavas' | 'quartas' | 'semi' | 'final' | 'third' }) => {
    const isPlaceholder = !match;
    const isFinished = match?.status === 'finalizado';
    const isLive = match?.status === 'ao_vivo';
    const isPenalty = isFinished && match.home_score === match.away_score && (match.home_penalties !== null || match.away_penalties !== null);
    
    const homeWin = isFinished && (
      (match.home_score || 0) > (match.away_score || 0) || 
      (match.home_score === match.away_score && (match.home_penalties || 0) > (match.away_penalties || 0))
    );
    const awayWin = isFinished && (
      (match.away_score || 0) > (match.home_score || 0) ||
      (match.away_score === match.home_score && (match.away_penalties || 0) > (match.home_penalties || 0))
    );

    return (
      <div className={`epic-bracket-card ${type} ${isPlaceholder ? 'is-placeholder' : ''} ${isLive ? 'is-live' : ''}`}>
        <div className="card-status-bar">
          {isLive && <span className="live-indicator"><span className="dot"></span> AO VIVO</span>}
          {isFinished && <span className="finished-indicator">ENCERRADO</span>}
          {!isFinished && !isLive && match?.date && <span className="upcoming-indicator">AGENDADO</span>}
        </div>

        <div className="card-header">
           {type === 'final' && <span className="final-label"><Trophy size={14}/> GRANDE FINAL <Star size={10} fill="currentColor"/></span>}
           {(type === 'semi' || type === 'quartas' || type === 'oitavas') && <span className="stage-label">{type.toUpperCase()}</span>}
           {type === 'third' && <span className="third-label">DISPUTA DE 3º LUGAR</span>}
        </div>

        <div className="card-teams">
          <div className={`epic-team ${isFinished && !homeWin && !isPlaceholder ? 'loser' : ''} ${homeWin ? 'winner' : ''}`}>
            <div className="team-info">
              {match?.home_team?.logo_url ? (
                <img src={match.home_team.logo_url} alt="" className="team-logo" />
              ) : <div className="team-logo-placeholder">?</div>}
              <span className="team-name">{match?.home_team?.name || placeholderHome}</span>
            </div>
            {(isFinished || isLive) && (
              <div className="score-container">
                <span className="team-score">{match.home_score}</span>
                {isPenalty && <span className="penalty-score">({match.home_penalties})</span>}
              </div>
            )}
          </div>
          
          <div className="team-divider"></div>
          
          <div className={`epic-team ${isFinished && !awayWin && !isPlaceholder ? 'loser' : ''} ${awayWin ? 'winner' : ''}`}>
            <div className="team-info">
              {match?.away_team?.logo_url ? (
                <img src={match.away_team.logo_url} alt="" className="team-logo" />
              ) : <div className="team-logo-placeholder">?</div>}
              <span className="team-name">{match?.away_team?.name || placeholderAway}</span>
            </div>
            {(isFinished || isLive) && (
              <div className="score-container">
                <span className="team-score">{match.away_score}</span>
                {isPenalty && <span className="penalty-score">({match.away_penalties})</span>}
              </div>
            )}
          </div>
        </div>

        {!isPlaceholder && (match.date || match.time) && (
          <div className="card-footer">
            <Calendar size={12}/> {match.date?.split('-').reverse().join('/')} 
            <Clock size={12} style={{marginLeft: '8px'}}/> {match.time?.slice(0,5)}
          </div>
        )}
      </div>
    );
  };

  const roundOf16 = matches?.filter(m => m.stage?.type === 'round_of_16') || [];
  const quarters = matches?.filter(m => m.stage?.type === 'quarter') || [];
  const semiFinals = matches?.filter(m => m.stage?.type === 'semi') || [];
  const final = matches?.find(m => m.stage?.type === 'final');
  const thirdPlace = matches?.find(m => m.stage?.type === 'third_place');
  const year = season?.year || new Date().getFullYear();

  return (
    <div className="epic-fases-page animate-fade">
      <div className="epic-background-glow"></div>
      
      <header className="epic-header">
        <div className="header-icon"><Trophy size={32} /></div>
        <h1 className="epic-title">CHAVES <span>DO MATA-MATA</span></h1>
        <p className="epic-subtitle">Acompanhe o caminho rumo à glória eterna</p>
      </header>

      <div className="bracket-tabs">
        {roundOf16.length > 0 && <button className={activeTab === 'oitavas' ? 'active' : ''} onClick={() => setActiveTab('oitavas')}>OITAVAS</button>}
        {quarters.length > 0 && <button className={activeTab === 'quartas' ? 'active' : ''} onClick={() => setActiveTab('quartas')}>QUARTAS</button>}
        <button className={activeTab === 'semis' ? 'active' : ''} onClick={() => setActiveTab('semis')}>SEMIS</button>
        <button className={activeTab === 'final' ? 'active' : ''} onClick={() => setActiveTab('final')}>FINAL</button>
      </div>

      <div className="epic-bracket-container">
        <div className="desktop-only epic-bracket-layout">
          {roundOf16.length > 0 && (
            <div className="bracket-col side-col">
              <div className="col-matches-stack" style={{ gap: '1rem' }}>
                {roundOf16.slice(0, Math.ceil(roundOf16.length/2)).map((m, i) => (
                  <BracketCard key={m.id} match={m} placeholderHome={`TIME ${i*2+1}`} placeholderAway={`TIME ${i*2+2}`} type="oitavas" />
                ))}
              </div>
            </div>
          )}

          {quarters.length > 0 && (
            <div className="bracket-col side-col">
              <div className="col-label">QUARTAS</div>
              <div className="col-matches-stack" style={{ gap: '2rem' }}>
                {quarters.slice(0, Math.ceil(quarters.length/2)).map((m, i) => (
                  <BracketCard key={m.id} match={m} placeholderHome={`VENC. OITAVAS ${i*2+1}`} placeholderAway={`VENC. OITAVAS ${i*2+2}`} type="quartas" />
                ))}
              </div>
            </div>
          )}

          <div className="bracket-col side-col left">
            <div className="col-label">SEMIFINAIS</div>
            <BracketCard match={semiFinals[0]} placeholderHome="1º COLOCADO" placeholderAway="4º COLOCADO" type="semi" />
          </div>

          <div className="bracket-col center-col">
            <div className="main-stage">
              <div className="final-wrapper">
                <div className="trophy-glow"></div>
                <BracketCard match={final} placeholderHome="VENCEDOR SEMI 1" placeholderAway="VENCEDOR SEMI 2" type="final" />
              </div>
              <div className="third-place-wrapper">
                <BracketCard match={thirdPlace} placeholderHome="PERDEDOR SEMI 1" placeholderAway="PERDEDOR SEMI 2" type="third" />
              </div>
            </div>
          </div>

          <div className="bracket-col side-col right">
            <div className="col-label">SEMIFINAIS</div>
            <BracketCard match={semiFinals[1]} placeholderHome="2º COLOCADO" placeholderAway="3º COLOCADO" type="semi" />
          </div>

          {quarters.length > 2 && (
            <div className="bracket-col side-col">
              <div className="col-label">QUARTAS</div>
              <div className="col-matches-stack" style={{ gap: '2rem' }}>
                {quarters.slice(Math.ceil(quarters.length/2)).map((m, i) => (
                  <BracketCard key={m.id} match={m} placeholderHome={`VENC. OITAVAS ${i*2+5}`} placeholderAway={`VENC. OITAVAS ${i*2+6}`} type="quartas" />
                ))}
              </div>
            </div>
          )}

          {roundOf16.length > 4 && (
            <div className="bracket-col side-col">
              <div className="col-label">OITAVAS</div>
              <div className="col-matches-stack" style={{ gap: '1rem' }}>
                {roundOf16.slice(Math.ceil(roundOf16.length/2)).map((m, i) => (
                  <BracketCard key={m.id} match={m} placeholderHome={`TIME ${i*2+9}`} placeholderAway={`TIME ${i*2+10}`} type="oitavas" />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mobile-only mobile-bracket-view">
          {activeTab === 'oitavas' && (
            <div className="mobile-stage-group">
              {roundOf16.map((m, i) => <BracketCard key={m.id} match={m} placeholderHome={`TIME ${i*2+1}`} placeholderAway={`TIME ${i*2+2}`} type="oitavas" />)}
            </div>
          )}
          {activeTab === 'quartas' && (
            <div className="mobile-stage-group">
              {quarters.map((m, i) => <BracketCard key={m.id} match={m} placeholderHome={`VENC. OITAVAS ${i*2+1}`} placeholderAway={`VENC. OITAVAS ${i*2+2}`} type="quartas" />)}
            </div>
          )}
          {activeTab === 'semis' && (
            <div className="mobile-stage-group">
              {semiFinals.map((m, i) => <BracketCard key={m.id} match={m} placeholderHome={`VENC. QUARTAS ${i*2+1}`} placeholderAway={`VENC. QUARTAS ${i*2+2}`} type="semi" />)}
            </div>
          )}
          {activeTab === 'final' && (
            <div className="mobile-stage-group">
              <BracketCard match={final} placeholderHome="VENCEDOR SEMI 1" placeholderAway="VENCEDOR SEMI 2" type="final" />
              <BracketCard match={thirdPlace} placeholderHome="PERDEDOR SEMI 1" placeholderAway="PERDEDOR SEMI 2" type="third" />
            </div>
          )}
        </div>
      </div>

      {final?.status === 'finalizado' && final.winner_id && (
        <div className="champion-celebration animate-up">
           <div className="champion-content">
              <div className="champion-badge">GRANDE CAMPEÃO</div>
              <img src={final.winner_id === final.home_team_id ? final.home_team?.logo_url : final.away_team?.logo_url} alt="" className="champion-shield" />
              <h2 className="champion-name">{final.winner_id === final.home_team_id ? final.home_team?.name : final.away_team?.name}</h2>
              <div className="celebration-footer">COPA DO MUNDO APD • {year}</div>
           </div>
        </div>
      )}

      <style>{`
        .epic-fases-page {
          position: relative;
          padding: 16px;
          background: var(--bg-color);
          min-height: 100vh;
        }

        .epic-background-glow {
          position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 80%; height: 60%;
          background: radial-gradient(circle at center, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .epic-header { text-align: center; margin-bottom: 2rem; position: relative; z-index: 1; }
        .header-icon { color: var(--primary-color); margin-bottom: 0.5rem; }
        .epic-title { font-size: 2.2rem; font-weight: 950; letter-spacing: -1.5px; margin: 0; color: var(--text-main); line-height: 1; }
        .epic-title span { color: var(--primary-color); font-size: 0.5em; display: inline-block; margin-left: 8px; opacity: 0.8; }
        .epic-subtitle { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; margin-top: 0.5rem; }

        .bracket-tabs {
          display: none;
          gap: 4px;
          background: var(--surface-alt);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          position: sticky;
          top: 70px;
          z-index: 10;
        }
        .bracket-tabs button {
          flex: 1;
          padding: 10px 4px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.65rem;
          font-weight: 800;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .bracket-tabs button.active {
          background: var(--card-bg);
          color: var(--primary-color);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .epic-bracket-container {
          position: relative;
          z-index: 1;
        }

        .epic-bracket-layout {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          width: 100%;
          padding: 2rem 0;
          overflow-x: auto;
        }

        .col-label {
          font-size: 0.6rem;
          font-weight: 950;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 1rem;
          letter-spacing: 1.5px;
          opacity: 0.6;
        }

        .bracket-col { display: flex; flex-direction: column; justify-content: center; }
        .col-matches-stack { display: flex; flex-direction: column; }
        .main-stage { display: flex; flex-direction: column; gap: 2rem; width: 100%; max-width: 320px; margin: 0 auto; }
        
        .final-wrapper { position: relative; z-index: 2; transform: scale(1.1); }
        .trophy-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 160%; height: 160%;
          background: radial-gradient(circle, rgba(var(--primary-rgb), 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .epic-bracket-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 12px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          min-width: 240px;
          box-shadow: var(--shadow-sm);
        }
        .epic-bracket-card:hover { 
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--primary-color);
        }
        .epic-bracket-card.final { border: 2px solid #eab308; background: linear-gradient(to bottom right, var(--card-bg), #fffdf5); }
        .epic-bracket-card.is-placeholder { border-style: dashed; opacity: 0.6; }
        .epic-bracket-card.is-live { border-color: var(--error); box-shadow: 0 0 15px rgba(239, 68, 68, 0.1); }

        .card-status-bar {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }
        .live-indicator { 
          font-size: 0.55rem; font-weight: 900; color: var(--error); display: flex; align-items: center; gap: 4px;
          background: #fee2e2; padding: 2px 8px; border-radius: 4px;
        }
        .live-indicator .dot { width: 4px; height: 4px; background: var(--error); border-radius: 50%; animation: pulse 1s infinite; }
        .finished-indicator { font-size: 0.55rem; font-weight: 800; color: var(--text-muted); opacity: 0.6; }
        .upcoming-indicator { font-size: 0.55rem; font-weight: 800; color: var(--primary-color); }

        .card-header { margin-bottom: 0.75rem; display: flex; align-items: center; }
        .final-label { font-size: 0.65rem; font-weight: 950; color: #854d0e; letter-spacing: 1.5px; display: flex; align-items: center; gap: 6px; }
        .stage-label { font-size: 0.55rem; font-weight: 950; color: var(--text-muted); letter-spacing: 1.2px; opacity: 0.5; }
        .third-label { font-size: 0.55rem; font-weight: 950; color: #9a3412; letter-spacing: 1.2px; opacity: 0.7; }

        .card-teams { display: flex; flex-direction: column; gap: 8px; }
        .epic-team { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; }
        .epic-team.loser { opacity: 0.4; }
        .epic-team.winner .team-name { color: var(--text-main); font-weight: 800; }
        
        .team-info { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .team-logo { width: 20px; height: 20px; object-fit: contain; }
        .team-logo-placeholder { width: 20px; height: 20px; background: var(--surface-alt); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--text-muted); border: 1px dashed var(--border-color); }
        .team-name { font-size: 0.8rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .score-container { display: flex; align-items: center; gap: 6px; }
        .team-score { font-size: 0.95rem; font-weight: 900; color: var(--text-main); min-width: 15px; text-align: center; }
        .penalty-score { font-size: 0.65rem; font-weight: 900; color: #b45309; background: #fffbeb; padding: 1px 4px; border-radius: 3px; }
        
        .team-divider { height: 1px; background: var(--border-color); opacity: 0.3; }

        .card-footer { margin-top: 0.8rem; display: flex; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 0.8rem; }
        .footer-item { font-size: 0.55rem; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }

        .champion-celebration {
          margin: 3rem auto;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 24px;
          padding: 2.5rem 1.5rem;
          text-align: center;
          color: white;
          width: 100%;
          max-width: 600px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .champion-badge { display: inline-block; padding: 6px 16px; background: #eab308; color: #422006; border-radius: 50px; font-weight: 950; font-size: 0.65rem; letter-spacing: 2px; margin-bottom: 1.5rem; }
        .champion-shield { width: 100px; height: 100px; object-fit: contain; margin-bottom: 1rem; filter: drop-shadow(0 0 20px rgba(234, 179, 8, 0.3)); }
        .champion-name { font-size: 2.5rem; font-weight: 950; letter-spacing: -1.5px; margin: 0; line-height: 1; }
        .celebration-footer { margin-top: 1.5rem; opacity: 0.4; font-weight: 800; font-size: 0.65rem; letter-spacing: 1.5px; }

        .fases-loader { display: flex; align-items: center; justify-content: center; min-height: 60vh; }

        .mobile-only { display: none; }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @media (max-width: 1000px) {
          .desktop-only { display: none; }
          .mobile-only { display: block; }
          .bracket-tabs { display: flex; }
          .mobile-bracket-view { padding-bottom: 4rem; }
          .mobile-stage-group { display: flex; flex-direction: column; gap: 1rem; }
          .epic-bracket-card { min-width: 0; }
          .epic-title { font-size: 1.8rem; }
          .champion-name { font-size: 2rem; }
        }
      `}</style>
    </div>
  );
};

export default Fases;
