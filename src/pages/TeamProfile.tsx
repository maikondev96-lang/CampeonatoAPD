import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useSeasonContext } from '../components/SeasonContext';
import { Player, Team } from '../types';
import { Shield, Users, Trophy, ChevronLeft, Loader2, Image as ImageIcon } from 'lucide-react';

export default function TeamProfile() {
  const { id } = useParams<{ id: string }>();
  const { season } = useSeasonContext();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && season) fetchTeamData();
  }, [id, season]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      // 1. Buscar dados do time
      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();
      
      if (teamErr) throw teamErr;
      setTeam(teamData);

      // 2. Buscar elenco vinculado a este time nesta temporada
      const { data: playersData, error: pErr } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', id)
        .eq('active', true)
        .order('number', { ascending: true });

      if (pErr) throw pErr;
      setPlayers(playersData || []);
    } catch (err) {
      console.error('Erro ao carregar perfil do time:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '5rem', textAlign: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary-color)" /></div>;
  if (!team) return <div style={{ padding: '5rem', textAlign: 'center' }}>Time não encontrado.</div>;

  return (
    <div className="page-fluid animate-fade">
      {/* Header com Cover e Escudo */}
      <div style={{ position: 'relative', marginBottom: '4rem' }}>
        <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--brand-dark) 0%, var(--primary-dark) 100%)', borderRadius: '16px' }}></div>
        
        <div style={{ 
          position: 'absolute', bottom: '-30px', left: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' 
        }}>
          <div style={{ 
            width: '120px', height: '120px', background: 'var(--card-bg)', borderRadius: '24px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '4px solid var(--card-bg)'
          }}>
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Shield size={60} color="var(--primary-color)" />
            )}
          </div>
          <div style={{ paddingBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 950, color: 'white', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>{team.name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '1rem', margin: 0 }}>
              {team.short_name} • Temporada {season?.year}
            </p>
          </div>
        </div>
      </div>

      <div className="team-profile-grid">
        
        {/* Lado Esquerdo: Elenco */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Users size={22} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0 }}>Elenco Oficial</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {players.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum jogador cadastrado para esta temporada.</p>
            ) : (
              players.map(player => (
                <div key={player.id} className="card-hover" style={{ 
                  display: 'grid', gridTemplateColumns: '50px 50px 1fr 100px', alignItems: 'center', 
                  padding: '0.75rem 1.25rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 950, color: 'var(--primary-color)' }}>{player.shirt_number || '--'}</span>
                  
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {player.photo_url ? (
                      <img src={player.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={player.name} />
                    ) : (
                      <ImageIcon size={18} color="var(--text-subtle)" />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{player.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{player.position}</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <Link to={`/jogador/${player.id}`} style={{ color: 'var(--primary-color)', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none' }}>VER PERFIL</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lado Direito: Info Adicional & Stats Rápidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="premium-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={16} /> Conquistas
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Em breve: Histórico de títulos e medalhas desta equipe na Liga APD.
            </p>
          </div>

          <Link to="/classificacao" className="btn btn-secondary" style={{ justifyContent: 'center', width: '100%' }}>
            <ChevronLeft size={16} /> Voltar para Tabela
          </Link>
        </div>

      </div>
      <style>{`
        .team-profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
          width: 100%;
        }
      `}</style>
    </div>
  );
}
