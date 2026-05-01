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
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (season) fetchRosters();
  }, [season]);

  useEffect(() => {
    if (selectedPlayer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedPlayer]);

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
              <div style={{ background: 'var(--surface-alt)', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {team.players.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontWeight: 700 }}>Nenhum jogador cadastrado para este time.</p>
                  ) : (
                    team.players.map(p => (
                      <div 
                        key={p.id} 
                        className="player-list-item" 
                        onClick={() => setSelectedPlayer(p)}
                      >
                        <div className="p-list-photo">
                          <img 
                            src={p.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} 
                            alt="" 
                          />
                        </div>
                        <div className="p-list-number">{p.shirt_number || '--'}</div>
                        <div className="p-list-name">{p.name}</div>
                        <div className="p-list-pos">{p.position || 'ATLETA'}</div>
                        <ChevronRight size={14} color="var(--text-muted)" />
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

      {/* MODAL PARA FOTO DO JOGADOR */}
      {selectedPlayer && (
        <div 
          className="player-photo-modal-overlay" 
          onClick={() => setSelectedPlayer(null)}
        >
          <div className="player-photo-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-photo-wrapper">
              <img src={selectedPlayer.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPlayer.name}`} alt="" />
              <div className="modal-player-badge">{selectedPlayer.shirt_number}</div>
            </div>
            <div className="modal-player-info">
              <h3>{selectedPlayer.name}</h3>
              <span>{selectedPlayer.position}</span>
            </div>
            <button className="modal-close-btn" onClick={() => setSelectedPlayer(null)}>FECHAR</button>
          </div>
        </div>
      )}

      <style>{`
        .player-list-item {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-color);
          background: var(--card-bg);
          gap: 12px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .player-list-item:hover { background: var(--surface-alt); }
        .player-list-item:last-child { border-bottom: none; }

        .p-list-photo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--surface-alt);
          flex-shrink: 0;
        }
        .p-list-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .p-list-number {
          width: 25px;
          font-size: 0.85rem;
          font-weight: 900;
          color: var(--primary-color);
          text-align: center;
          flex-shrink: 0;
        }

        .p-list-name {
          flex: 1;
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--text-main);
        }

        .p-list-pos {
          font-size: 0.6rem;
          font-weight: 900;
          color: var(--text-muted);
          background: var(--surface-alt);
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        /* MODAL STYLES */
        .player-photo-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          box-sizing: border-box;
        }
        .player-photo-modal-content {
          background: var(--card-bg);
          border-radius: 28px;
          width: 100%;
          max-width: 380px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          animation: modalScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 30px 60px rgba(0,0,0,0.5);
          position: relative;
        }
        @keyframes modalScaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-photo-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
        }
        .modal-photo-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .modal-player-badge {
          position: absolute;
          top: 20px; right: 20px;
          background: var(--primary-color);
          color: white;
          padding: 8px 16px;
          border-radius: 12px;
          font-weight: 950;
          font-size: 1.2rem;
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }

        .modal-player-info {
          padding: 1.5rem;
          text-align: center;
        }
        .modal-player-info h3 {
          font-size: 1.4rem;
          font-weight: 950;
          margin: 0;
          color: var(--text-main);
          text-transform: uppercase;
        }
        .modal-player-info span {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .modal-close-btn {
          width: 100%;
          padding: 1.25rem;
          background: var(--surface-alt);
          border: none;
          border-top: 1px solid var(--border-color);
          font-weight: 900;
          color: var(--primary-color);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
