import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Match } from '../types';
import { Trophy, Loader2, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoApd from '../assets/logo.png';

const Fases = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFases();
  }, []);

  const fetchFases = async () => {
    const { data } = await supabase.from('matches')
      .select('*, home_team:teams!matches_home_team_id_fkey(*), away_team:teams!matches_away_team_id_fkey(*)')
      .in('phase', ['semifinal', 'terceiro_lugar', 'final'])
      .order('created_at');
    if (data) setMatches(data);
    setLoading(false);
  };

  const semiFinals = matches.filter(m => m.phase === 'semifinal');
  const thirdPlace = matches.find(m => m.phase === 'terceiro_lugar');
  const final = matches.find(m => m.phase === 'final');

  const MatchCard = ({ match, placeholderHome, placeholderAway, isFinal = false, isThird = false }: { match?: Match, placeholderHome: string, placeholderAway: string, isFinal?: boolean, isThird?: boolean }) => {
    const isPlaceholder = !match;
    
    const content = (
      <div className={`bracket-match ${!isPlaceholder ? 'card-hover' : ''} ${isFinal ? 'final-card-gold' : ''} ${isThird ? 'bronze-card' : ''}`} style={{ 
        cursor: isPlaceholder ? 'default' : 'pointer',
        opacity: isPlaceholder ? 0.7 : 1,
        borderStyle: isPlaceholder ? 'dashed' : 'solid',
        width: '100%',
        margin: '0'
      }}>
        {isFinal && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#b89112', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
            <Trophy size={14} /> Grande Final <Star size={12} fill="#b89112" />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            <div className={`bracket-team ${match?.winner_id === match?.home_team_id ? 'winner' : ''}`} style={{ border: 'none', padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                {match?.home_team ? (
                  <img src={match.home_team.logo_url} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" />
                ) : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>?</div>}
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: match?.winner_id === match?.home_team_id ? 900 : 500 }}>{match?.home_team?.name || placeholderHome}</span>
              </div>
            </div>
            <div className={`bracket-team ${match?.winner_id === match?.away_team_id ? 'winner' : ''}`} style={{ border: 'none', padding: 0, marginTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                {match?.away_team ? (
                  <img src={match.away_team.logo_url} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" />
                ) : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>?</div>}
                <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: match?.winner_id === match?.away_team_id ? 900 : 500 }}>{match?.away_team?.name || placeholderAway}</span>
              </div>
            </div>
          </div>

          <div className="score-display-premium" style={{ minWidth: '70px', padding: '0.5rem' }}>
            {!isPlaceholder && (match.status === 'finalizado' || match.status === 'ao_vivo') ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="score-wrapper-premium">
                  {match.home_penalties !== null && <span className="penalty-score-premium" style={{ left: '-25px', top: '2px' }}>({match.home_penalties})</span>}
                  <span className="score-number-premium">{match.home_score}</span>
                </div>
                <div className="score-wrapper-premium">
                  {match.away_penalties !== null && <span className="penalty-score-premium" style={{ left: '-25px', top: '2px' }}>({match.away_penalties})</span>}
                  <span className="score-number-premium">{match.away_score}</span>
                </div>
              </div>
            ) : <span style={{ opacity: 0.3 }}>-</span>}
          </div>
        </div>

        {!isPlaceholder && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: match.status === 'adiado' ? 'var(--error)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
              {match.status === 'adiado' ? '⚠️ Adiado' : match.date ? match.date.split('-').reverse().join('/') : 'Data a definir'}
            </span>
            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: match.status === 'finalizado' ? 'var(--text-muted)' : match.status === 'adiado' ? 'var(--error)' : 'var(--primary-color)', textTransform: 'uppercase' }}>
              {match.status === 'finalizado' ? 'Encerrado' : match.status === 'adiado' ? 'Data a definir' : match.time ? match.time.slice(0, 5) : 'Horário a definir'}
            </span>
          </div>
        )}
      </div>
    );

    if (isPlaceholder) return content;
    return <Link to={`/jogos/${match.id}`} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>{content}</Link>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-fade container">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="section-title" style={{ justifyContent: 'center', marginBottom: '1rem' }}><Trophy /> Fase Final</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>A jornada rumo ao topo da Copa do Mundo APD.</p>
      </div>

      <div className="bracket-container">
        
        {/* COLUNA ESQUERDA: SEMIFINAL 1 */}
        <div className="bracket-column" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Semifinal 1</div>
          </div>
          <MatchCard 
            match={semiFinals[0]} 
            placeholderHome="1º Colocado" 
            placeholderAway="4º Colocado" 
          />
        </div>

        {/* COLUNA CENTRAL: GRANDE FINAL E 3º LUGAR */}
        <div className="bracket-column" style={{ gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#b89112', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '1.5rem' }}>O Palco Principal</div>
            <MatchCard 
              match={final} 
              placeholderHome="Vencedor Semi 1" 
              placeholderAway="Vencedor Semi 2" 
              isFinal
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#cd7f32', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem' }}>Disputa de 3º Lugar</div>
            <MatchCard 
              match={thirdPlace} 
              placeholderHome="A definir (Semi 1)" 
              placeholderAway="A definir (Semi 2)" 
              isThird
            />
          </div>
        </div>

        {/* COLUNA DIREITA: SEMIFINAL 2 */}
        <div className="bracket-column" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Semifinal 2</div>
          </div>
          <MatchCard 
            match={semiFinals[1]} 
            placeholderHome="2º Colocado" 
            placeholderAway="3º Colocado" 
          />
        </div>
      </div>

      {/* CAMPEÃO CELEBRAÇÃO */}
      {final?.status === 'finalizado' && final.winner_id && (
        <div className="premium-card animate-up" style={{ 
          background: 'linear-gradient(135deg, var(--primary-dark), #1e293b)', 
          border: 'none',
          textAlign: 'center', 
          padding: '4rem 2rem',
          marginTop: '6rem',
          color: '#fff'
        }}>
          <img src={logoApd} style={{ height: 120, width: 'auto', marginBottom: '3rem', filter: 'drop-shadow(0 0 40px rgba(255, 255, 255, 0.4))' }} alt="" />
          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
            <img 
              src={final.winner_id === final.home_team_id ? final.home_team?.logo_url : final.away_team?.logo_url} 
              style={{ width: 150, height: 150, objectFit: 'contain', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.5))' }} 
              alt=""
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#ffd700', fontSize: '1.1rem', fontWeight: 950, letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '1rem' }}>🏆 Grande Campeão 🏆</div>
              <h1 style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: 950, letterSpacing: '-3px', lineHeight: 0.9, margin: 0 }}>
                {final.winner_id === final.home_team_id ? final.home_team?.name : final.away_team?.name}
              </h1>
              <p style={{ marginTop: '1.5rem', opacity: 0.5, fontSize: '0.9rem', fontWeight: 700 }}>Copa do Mundo APD • Edição 2026</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fases;

