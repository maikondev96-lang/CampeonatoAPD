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

  const MatchCard = ({ match, placeholderHome, placeholderAway }: { match?: Match, placeholderHome: string, placeholderAway: string }) => {
    const isPlaceholder = !match;
    
    const content = (
      <div className={`bracket-match ${!isPlaceholder ? 'card-hover' : ''}`} style={{ 
        cursor: isPlaceholder ? 'default' : 'pointer',
        opacity: isPlaceholder ? 0.7 : 1,
        borderStyle: isPlaceholder ? 'dashed' : 'solid',
        maxWidth: '320px',
        margin: '0 auto'
      }}>
        <div className={`bracket-team ${match?.winner_id === match?.home_team_id ? 'winner' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {match?.home_team ? (
              <img src={match.home_team.logo_url} style={{ width: 22, height: 22, objectFit: 'contain' }} alt="" />
            ) : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>?</div>}
            <span style={{ fontSize: '0.85rem' }}>{match?.home_team?.name || placeholderHome}</span>
          </div>
          <div className="bracket-score">
            {!isPlaceholder && match.status === 'finalizado' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {match.home_score}
                {match.home_penalties !== null && match.home_penalties !== undefined && (
                  <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>({match.home_penalties})</span>
                )}
              </div>
            ) : '-'}
          </div>
        </div>
        
        <div className={`bracket-team ${match?.winner_id === match?.away_team_id ? 'winner' : ''}`} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {match?.away_team ? (
              <img src={match.away_team.logo_url} style={{ width: 22, height: 22, objectFit: 'contain' }} alt="" />
            ) : <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'var(--text-muted)' }}>?</div>}
            <span style={{ fontSize: '0.85rem' }}>{match?.away_team?.name || placeholderAway}</span>
          </div>
          <div className="bracket-score">
            {!isPlaceholder && match.status === 'finalizado' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {match.away_score}
                {match.away_penalties !== null && match.away_penalties !== undefined && (
                  <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>({match.away_penalties})</span>
                )}
              </div>
            ) : '-'}
          </div>
        </div>

        {!isPlaceholder && match.status === 'finalizado' && match.home_team_id && match.away_team_id && (
          <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--primary-color)', marginTop: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Partida encerrada <ChevronRight size={10} />
          </div>
        )}
      </div>
    );

    if (isPlaceholder) return content;
    return <Link to={`/jogos/${match.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  return (
    <div className="animate-fade">
      <h1 className="section-title"><Trophy /> Fase Final</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
        
        {/* SEMIFINAIS */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: '4px', height: '16px', background: 'var(--primary-color)', borderRadius: '2px' }}></div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Semifinais</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <MatchCard 
              match={semiFinals[0]} 
              placeholderHome="1º Colocado" 
              placeholderAway="4º Colocado" 
            />
            <MatchCard 
              match={semiFinals[1]} 
              placeholderHome="2º Colocado" 
              placeholderAway="3º Colocado" 
            />
          </div>
        </section>

        {/* FINAL E 3º LUGAR */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
          
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '4px', height: '16px', background: 'var(--secondary-color)', borderRadius: '2px' }}></div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Disputa de 3º Lugar</h4>
            </div>
            <MatchCard 
              match={thirdPlace} 
              placeholderHome="A definir (S1)" 
              placeholderAway="A definir (S2)" 
            />
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '4px', height: '16px', background: 'var(--primary-color)', borderRadius: '2px' }}></div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Grande Final <Star size={16} fill="var(--primary-color)" />
              </h4>
            </div>
            <MatchCard 
              match={final} 
              placeholderHome="Vencedor Semi 1" 
              placeholderAway="Vencedor Semi 2" 
            />
          </section>
        </div>

        {/* CAMPEÃO CELEBRAÇÃO (Só aparece se tiver vencedor na final) */}
        {final?.status === 'finalizado' && final.winner_id && (
          <div className="card animate-up" style={{ 
            background: 'linear-gradient(135deg, var(--primary-dark), #1e293b)', 
            border: 'none',
            textAlign: 'center', 
            padding: '3rem 2rem',
            marginTop: '3rem',
            color: '#fff',
            maxWidth: '800px',
            margin: '3rem auto'
          }}>
            <img src={logoApd} style={{ height: 180, width: 'auto', marginBottom: '2.5rem', filter: 'drop-shadow(0 0 50px rgba(255, 255, 255, 0.5))' }} alt="" />
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              <img 
                src={final.winner_id === final.home_team_id ? final.home_team?.logo_url : final.away_team?.logo_url} 
                style={{ width: 130, height: 130, objectFit: 'contain', filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.4))' }} 
                alt=""
              />
              <h1 style={{ fontSize: '4rem', fontWeight: 950, letterSpacing: '-2px', margin: 0 }}>
                {final.winner_id === final.home_team_id ? final.home_team?.name : final.away_team?.name}
              </h1>
            </div>

            <h2 style={{ color: 'var(--secondary-color)', fontSize: '1rem', marginTop: '2.5rem', fontWeight: 950, letterSpacing: '6px', textTransform: 'uppercase' }}>🏆 Grande Campeão 🏆</h2>
            <p style={{ marginTop: '1rem', opacity: 0.6, fontSize: '0.85rem', fontWeight: 700 }}>Copa do Mundo APD • Edição 2026</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fases;
