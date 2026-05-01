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

  const semiFinals = matches.filter((m: any) => m.stage?.type === 'semi');
  const thirdPlace = matches.find((m: any) => m.stage?.type === 'third_place');
  const final = matches.find((m: any) => m.stage?.type === 'final');

  const BracketCard = ({ match, placeholderHome, placeholderAway, type }: { match?: Match, placeholderHome: string, placeholderAway: string, type: 'semi' | 'final' | 'third' }) => {
    const isPlaceholder = !match;
    const isFinished = match?.status === 'finalizado';
    const homeWin = isFinished && (match.home_score || 0) >= (match.away_score || 0);
    const awayWin = isFinished && (match.away_score || 0) > (match.home_score || 0);

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
            {isFinished && <span className="team-score">{match.home_score}</span>}
          </div>
          <div className="team-divider"></div>
          <div className={`epic-team ${isFinished && !awayWin ? 'loser' : ''}`}>
            <div className="team-info">
              {match?.away_team?.logo_url ? (
                <img src={match.away_team.logo_url} alt="" className="team-logo" />
              ) : <div className="team-logo-placeholder">?</div>}
              <span className="team-name">{match?.away_team?.name || placeholderAway}</span>
            </div>
            {isFinished && <span className="team-score">{match.away_score}</span>}
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
        <div className="bracket-col side-col left">
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
          <BracketCard match={semiFinals[1]} placeholderHome="2º COLOCADO" placeholderAway="3º COLOCADO" type="semi" />
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
          min-height: calc(100vh - 120px);
          position: relative;
          overflow: hidden;
          padding: 1rem 2rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
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
          display: grid;
          grid-template-columns: 1fr 1.4fr 1fr;
          align-items: center;
          gap: 1rem;
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
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
          background: rgba(255,255,255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(0,0,0, 0.05);
          border-radius: 16px;
          padding: 1rem;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          position: relative;
          transition: all 0.2s ease;
        }
        .epic-bracket-card:hover { transform: translateY(-2px); border-color: var(--primary-color); }
        .epic-bracket-card.final { background: linear-gradient(145deg, #ffffff, #fffdf0); border: 2px solid #fef08a; padding: 1.25rem; }
        .epic-bracket-card.is-placeholder { border-style: dashed; opacity: 0.6; }

        .card-header { margin-bottom: 0.75rem; display: flex; justify-content: center; }
        .final-label { font-size: 0.65rem; font-weight: 950; color: #854d0e; letter-spacing: 1.5px; display: flex; align-items: center; gap: 6px; }
        .semi-label { font-size: 0.55rem; font-weight: 950; color: #64748b; letter-spacing: 1.2px; opacity: 0.5; }
        .third-label { font-size: 0.55rem; font-weight: 950; color: #9a3412; letter-spacing: 1.2px; opacity: 0.7; }

        .card-teams { display: flex; flex-direction: column; gap: 0.5rem; }
        .epic-team { display: flex; align-items: center; justify-content: space-between; }
        .epic-team.loser { opacity: 0.3; filter: grayscale(1); }
        .team-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .team-logo { width: 24px; height: 24px; object-fit: contain; }
        .team-logo-placeholder { width: 24px; height: 24px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #94a3b8; }
        .team-name { font-size: 0.85rem; font-weight: 850; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .team-score { font-size: 1.2rem; font-weight: 950; color: var(--text-main); }
        .final .team-name { font-size: 0.95rem; }
        .final .team-score { font-size: 1.6rem; color: var(--primary-dark); }

        .team-divider { height: 1px; background: rgba(0,0,0, 0.02); width: 100%; }

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
