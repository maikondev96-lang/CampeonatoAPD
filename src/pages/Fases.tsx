import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Match, Stage } from '../types';
import { Trophy, Loader2, Star, ChevronRight, Shield, Award, Target } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import logoApd from '../assets/logo.png';
import { useSeasonContext } from '../components/SeasonContext';

const Fases = () => {
  const { slug, year } = useParams<{ slug: string; year: string }>();
  const { season, loading: ctxLoading } = useSeasonContext();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (season) fetchFases();
  }, [season]);

  const fetchFases = async () => {
    if (!season) return;
    setLoading(true);

    const { data } = await supabase.from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(*)')
      .eq('season_id', season.id)
      .order('created_at');
    
    if (data) {
      const knockoutMatches = data.filter((m: any) => m.stage && m.stage.type !== 'group');
      setMatches(knockoutMatches);
    }
    setLoading(false);
  };

  const roundOf16 = matches.filter((m: any) => m.stage?.type === 'round_of_16');
  const quarters = matches.filter((m: any) => m.stage?.type === 'quarter');
  const semiFinals = matches.filter((m: any) => m.stage?.type === 'semi');
  const thirdPlace = matches.find((m: any) => m.stage?.type === 'third_place');
  const final = matches.find((m: any) => m.stage?.type === 'final');

  const BracketCard = ({ match, placeholderHome, placeholderAway, type }: { match?: Match, placeholderHome: string, placeholderAway: string, type: 'semi' | 'final' | 'third' }) => {
    const isPlaceholder = !match;
    const isFinished = match?.status === 'finalizado';
    const isPenalty = isFinished && match.home_score === match.away_score && (match.home_penalties || match.away_penalties);
    const homeWin = isFinished && (
      (match.home_score || 0) > (match.away_score || 0) || 
      (match.home_score === match.away_score && (match.home_penalties || 0) > (match.away_penalties || 0))
    );
    const awayWin = isFinished && (
      (match.away_score || 0) > (match.home_score || 0) ||
      (match.away_score === match.home_score && (match.away_penalties || 0) > (match.home_penalties || 0))
    );

    const cardContent = (
      <div className={`epic-bracket-card ${type} ${isPlaceholder ? 'is-placeholder' : ''}`}>
        <div className="card-header">
           {type === 'final' && <span className="final-label"><Trophy size={14}/> GRANDE FINAL <Star size={10} fill="currentColor"/></span>}
           {type === 'semi' && <span className="semi-label">SEMIFINAL</span>}
           {type === 'third' && <span className="third-label">DISPUTA DE 3º LUGAR</span>}
        </div>

        <div className="card-teams">
          <div className={`epic-team ${isFinished && !homeWin ? 'loser' : ''}`}>
            <div className="team-info">
              {match?.home_team?.logo_url ? (
                <img src={match.home_team.logo_url} alt="" className="team-logo" />
              ) : <div className="team-logo-placeholder">?</div>}
              <span className="team-name">{match?.home_team?.name || placeholderHome}</span>
            </div>
            {isFinished && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="team-score">{match.home_score}</span>
                {isPenalty && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b45309' }}>({match.home_penalties})</span>}
              </div>
            )}
          </div>
          <div className="team-divider"></div>
          <div className={`epic-team ${isFinished && !awayWin ? 'loser' : ''}`}>
            <div className="team-info">
              {match?.away_team?.logo_url ? (
                <img src={match.away_team.logo_url} alt="" className="team-logo" />
              ) : <div className="team-logo-placeholder">?</div>}
              <span className="team-name">{match?.away_team?.name || placeholderAway}</span>
            </div>
            {isFinished && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span className="team-score">{match.away_score}</span>
                {isPenalty && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#b45309' }}>({match.away_penalties})</span>}
              </div>
            )}
          </div>
        </div>

        {!isPlaceholder && !isFinished && (
          <div className="card-footer">
            <span className="date-info">{match.date?.split('-').reverse().join('/') || 'A DEFINIR'}</span>
            <span className="time-info">{match.time?.slice(0, 5) || 'A DEFINIR'}</span>
          </div>
        )}
      </div>
    );

    if (isPlaceholder) return cardContent;
    return <Link to={`/competitions/${slug}/${year}/jogos/${match.id}`} className="card-link-wrapper">{cardContent}</Link>;
  };

  if (loading || ctxLoading) return <div className="fases-loader"><Loader2 className="animate-spin" size={48} color="var(--primary-color)"/></div>;

  return (
    <div className="page-fluid epic-fases-page animate-fade">
      <div className="epic-background-glow"></div>
      
      <header className="epic-header">
        <div className="header-icon"><Trophy size={32}/></div>
        <h1 className="epic-title">Fase Final <span>{year}</span></h1>
        <p className="epic-subtitle">Onde as lendas são escritas e a história é feita.</p>
      </header>

      <div className="epic-bracket-layout">
        {/* OITAVAS (ESQUERDA) */}
        {roundOf16.length > 0 && (
          <div className="bracket-col side-col">
            <div className="col-label">OITAVAS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {roundOf16.slice(0, Math.ceil(roundOf16.length/2)).map((m, i) => (
                <BracketCard key={m.id} match={m} placeholderHome={`TIME ${i*2+1}`} placeholderAway={`TIME ${i*2+2}`} type="semi" />
              ))}
            </div>
          </div>
        )}

        {/* QUARTAS (ESQUERDA) */}
        {quarters.length > 0 && (
          <div className="bracket-col side-col">
            <div className="col-label">QUARTAS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {quarters.slice(0, Math.ceil(quarters.length/2)).map((m, i) => (
                <BracketCard key={m.id} match={m} placeholderHome={`VENC. OITAVAS ${i*2+1}`} placeholderAway={`VENC. OITAVAS ${i*2+2}`} type="semi" />
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

        {/* QUARTAS (DIREITA) */}
        {quarters.length > 2 && (
          <div className="bracket-col side-col">
            <div className="col-label">QUARTAS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {quarters.slice(Math.ceil(quarters.length/2)).map((m, i) => (
                <BracketCard key={m.id} match={m} placeholderHome={`VENC. OITAVAS ${i*2+5}`} placeholderAway={`VENC. OITAVAS ${i*2+6}`} type="semi" />
              ))}
            </div>
          </div>
        )}

        {/* OITAVAS (DIREITA) */}
        {roundOf16.length > 4 && (
          <div className="bracket-col side-col">
            <div className="col-label">OITAVAS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {roundOf16.slice(Math.ceil(roundOf16.length/2)).map((m, i) => (
                <BracketCard key={m.id} match={m} placeholderHome={`TIME ${i*2+9}`} placeholderAway={`TIME ${i*2+10}`} type="semi" />
              ))}
            </div>
          </div>
        )}
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
          overflow: hidden;
          padding: 16px;
          background: var(--bg-color);
        }

        .epic-background-glow {
          position: absolute;
          top: 0; left: 50%; transform: translateX(-50%);
          width: 80%; height: 60%;
          background: radial-gradient(circle at center, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .epic-header { text-align: center; margin-bottom: 1.5rem; position: relative; z-index: 1; }
        .header-icon { color: var(--primary-color); margin-bottom: 0.5rem; }
        .epic-title { font-size: 2.2rem; font-weight: 950; letter-spacing: -1.5px; margin: 0; color: var(--text-main); line-height: 1; }
        .epic-title span { color: var(--primary-color); font-size: 0.5em; display: inline-block; margin-left: 8px; opacity: 0.8; }
        .epic-subtitle { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; margin-top: 0.5rem; }

        .epic-bracket-layout {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          position: relative;
          z-index: 1;
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
        .main-stage { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; max-width: 400px; margin: 0 auto; }
        .final-wrapper { position: relative; z-index: 2; transform: scale(1.05); }
        .trophy-glow {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 140%; height: 140%;
          background: radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .epic-bracket-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 8px 10px;
          position: relative;
          transition: all 0.2s ease;
          width: 100%;
          min-width: 220px;
        }
        .epic-bracket-card:hover { background: var(--card-hover); }
        .epic-bracket-card.final { border: 2px solid #eab308; background: #fffcf0; }
        .epic-bracket-card.is-placeholder { border-style: dashed; opacity: 0.6; }

        .card-header { margin-bottom: 0.75rem; display: flex; justify-content: center; }
        .final-label { font-size: 0.65rem; font-weight: 950; color: #854d0e; letter-spacing: 1.5px; display: flex; align-items: center; gap: 6px; }
        .semi-label { font-size: 0.55rem; font-weight: 950; color: #64748b; letter-spacing: 1.2px; opacity: 0.5; }
        .third-label { font-size: 0.55rem; font-weight: 950; color: #9a3412; letter-spacing: 1.2px; opacity: 0.7; }

        .card-teams { display: flex; flex-direction: column; gap: 4px; }
        .epic-team { display: flex; align-items: center; justify-content: space-between; }
        .epic-team.loser { opacity: 0.4; }
        .team-info { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
        .team-logo { width: 16px; height: 16px; object-fit: contain; }
        .team-logo-placeholder { width: 16px; height: 16px; background: var(--surface-alt); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.5rem; color: var(--text-muted); border: 1px dashed var(--border-color); }
        .team-name { font-size: 0.75rem; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .team-score { font-size: 0.85rem; font-weight: 800; color: var(--text-main); margin-left: 8px; }
        .final .team-name { font-size: 0.85rem; font-weight: 800; }
        .final .team-score { font-size: 1rem; color: var(--primary-dark); }
        
        .team-divider { display: none; }

        .card-footer { margin-top: 0.6rem; display: flex; justify-content: space-between; border-top: 1px solid rgba(0,0,0, 0.02); padding-top: 0.5rem; }
        .date-info { font-size: 0.55rem; font-weight: 800; color: var(--text-muted); }
        .time-info { font-size: 0.55rem; font-weight: 900; color: var(--primary-color); }

        .champion-celebration {
          margin-top: 2rem;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 20px;
          padding: 1.5rem;
          text-align: center;
          color: white;
          width: 100%;
          max-width: 800px;
          margin-left: auto; margin-right: auto;
        }
        .champion-badge { display: inline-block; padding: 4px 12px; background: #eab308; color: #422006; border-radius: 50px; font-weight: 950; font-size: 0.65rem; letter-spacing: 2px; margin-bottom: 1rem; }
        .champion-shield { width: 80px; height: 80px; object-fit: contain; margin-bottom: 0.75rem; }
        .champion-name { font-size: 2.2rem; font-weight: 950; letter-spacing: -1.5px; margin: 0; line-height: 1; }
        .celebration-footer { margin-top: 1rem; opacity: 0.4; font-weight: 800; font-size: 0.65rem; letter-spacing: 1.5px; }

        .fases-loader { display: flex; align-items: center; justify-content: center; min-height: 60vh; }

        @media (max-width: 1000px) {
          .epic-bracket-layout { grid-template-columns: 1fr; gap: 2rem; }
          .main-stage { order: -1; }
          .epic-fases-page { overflow-y: auto; height: auto; }
        }
      `}</style>
    </div>
  );
};

export default Fases;
