import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Team, Player } from '../types';
import { useSeasonContext } from '../components/SeasonContext';
import { Users, Loader2, Search, ChevronRight, ChevronDown, ChevronUp, UserSquare2, Shield } from 'lucide-react';
import { getSmartData } from '../utils/smartCache';

export default function TournamentRosters() {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [teams, setTeams] = useState<(Team & { players: Player[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (season) fetchRosters();
  }, [season]);

  const fetchRosters = async () => {
    if (!season) return;
    setLoading(true);
    try {
      // 1. Usa SmartCache para buscar os dados consolidados do elenco
      const data = await getSmartData(`elencos_${season.id}`, async () => {
        // Fetch Season Teams
        const { data: stData } = await supabase
          .from('season_teams')
          .select('team:teams(*)')
          .eq('season_id', season.id);
        
        const teamList = stData?.map((st: any) => st.team).filter(Boolean) || [];
        const teamIds = teamList.map(t => t.id);

        // Fetch Players for these teams
        const { data: pData } = await supabase
          .from('players')
          .select('*')
          .in('team_id', teamIds)
          .order('shirt_number', { ascending: true });

        return teamList.map(t => ({
          ...t,
          players: (pData || []).filter(p => p.team_id === t.id)
        })).sort((a, b) => a.name.localeCompare(b.name));
      });

      setTeams(data);
    } catch (err) {
      console.error('Error fetching rosters:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.players.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (ctxLoading || loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={40} color="var(--primary-color)" /></div>;

  return (
    <div className="animate-fade container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 className="section-title" style={{ justifyContent: 'center' }}><Users /> ELENCOS E ATLETAS</h1>
        <p style={{ color: 'var(--text-muted)' }}>Confira os jogadores inscritos em cada equipe para esta temporada.</p>
      </div>

      {/* SEARCH */}
      <div style={{ position: 'relative', marginBottom: '2rem' }}>
        <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
        <input 
          type="text" 
          placeholder="Buscar por time ou jogador..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="form-control"
          style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', fontWeight: 700 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTeams.map(team => (
          <div key={team.id} className="premium-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
              style={{ 
                width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', 
                alignItems: 'center', background: 'var(--card-bg)', border: 'none', cursor: 'pointer', color: 'inherit' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '12px' }}>
                  <img src={team.logo_url} style={{ width: 40, height: 40, objectFit: 'contain' }} alt="" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 950, color: 'var(--text-main)', fontSize: '1.2rem' }}>{team.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>{team.players.length} ATLETAS INSCRITOS</div>
                </div>
              </div>
              {expandedTeamId === team.id ? <ChevronUp size={24} color="var(--primary-color)" /> : <ChevronDown size={24} color="var(--text-muted)" />}
            </button>

            {expandedTeamId === team.id && (
              <div style={{ padding: '0 1.5rem 1.5rem', background: 'var(--surface-alt)', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                  {team.players.length === 0 ? (
                    <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 700 }}>Nenhum jogador cadastrado para este time.</p>
                  ) : (
                    team.players.map(p => (
                      <div key={p.id} className="player-card-premium">
                        <div className="player-card-photo-area">
                          <img 
                            src={p.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                            alt="" 
                            className="p-card-img" 
                          />
                          <div className="p-card-number-badge">{p.shirt_number || '--'}</div>
                        </div>
                        <div className="player-card-info">
                          <div className="p-card-pos-tag">{p.position || 'ATLETA'}</div>
                          <h4 className="p-card-name">{p.name}</h4>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredTeams.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ fontWeight: 800, color: 'var(--text-muted)' }}>Nenhum time ou atleta encontrado.</p>
          </div>
        )}
      </div>

      <style>{`
        .player-card-premium {
          display: flex;
          flex-direction: column;
          background: var(--card-bg);
          border-radius: 20px;
          border: 1px solid var(--border-color);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .player-card-premium:hover {
          transform: translateY(-8px);
          border-color: var(--primary-color);
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
        }

        .player-card-photo-area {
          position: relative;
          width: 100%;
          padding-top: 100%; /* Square aspect ratio */
          background: var(--surface-alt);
          overflow: hidden;
        }
        .p-card-img {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .player-card-premium:hover .p-card-img { transform: scale(1.05); }

        .p-card-number-badge {
          position: absolute;
          top: 12px; right: 12px;
          background: var(--primary-color);
          color: white;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 950;
          box-shadow: 0 4px 10px rgba(var(--primary-rgb), 0.4);
          z-index: 2;
        }

        .player-card-info {
          padding: 1.25rem;
          background: var(--card-bg);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .p-card-pos-tag {
          font-size: 0.6rem;
          font-weight: 950;
          color: var(--text-muted);
          background: var(--surface-alt);
          padding: 3px 10px;
          border-radius: 50px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .p-card-name {
          font-size: 1rem;
          font-weight: 900;
          color: var(--text-main);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }

        @media (max-width: 640px) {
           .player-card-info { padding: 0.75rem; }
           .p-card-name { font-size: 0.85rem; }
        }
      `}</style>
    </div>
  );
}
