import React, { useState, useEffect } from 'react';
import { Team, Player } from '../types';
import { useSeasonContext } from '../components/SeasonContext';
import { Users, Loader2, Search, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

// SUB-COMPONENTE MODAL (PROFISSIONAL)
const PlayerModal = ({ player, onClose }: { player: Player, onClose: () => void }) => {
  const modalRoot = document.getElementById('modal-root');

  useEffect(() => {
    const originalOverflowBody = document.body.style.overflow;
    const originalOverflowHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { 
      document.body.style.overflow = originalOverflowBody || 'unset';
      document.documentElement.style.overflow = originalOverflowHtml || 'unset';
    };
  }, []);

  if (!modalRoot) return null;

  return createPortal(
    <div className="player-modal-overlay" onClick={onClose}>
      <div className="player-modal-content" onClick={e => e.stopPropagation()}>
        <div className="player-modal-photo">
          <img 
            src={player.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} 
            alt={player.name} 
          />
          <div className="player-modal-badge">{player.shirt_number}</div>
        </div>
        <div className="player-modal-body">
          <h2 className="player-modal-name">{player.name}</h2>
          <span className="player-modal-pos">{player.position || 'ATLETA'}</span>
        </div>
        <div className="player-modal-footer">
          <button className="player-modal-close" onClick={onClose}>FECHAR</button>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

const PlayerItem = React.memo(({ p, onClick }: { p: Player, onClick: () => void }) => (
  <div className="roster-player-item" onClick={onClick}>
    <div className="player-avatar">
      <img src={p.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`} alt="" loading="lazy" />
    </div>
    <span className="player-num">#{p.shirt_number || '00'}</span>
    <span className="player-name">{p.name}</span>
    <span className="player-pos-badge">{p.position || 'ATLETA'}</span>
    <ChevronRight size={16} className="arrow-icon" />
  </div>
));

export default function TournamentRosters() {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { data: teams, isLoading: queryLoading } = useQuery({
    queryKey: ['rosters', season?.id],
    queryFn: async () => {
      // 1. Tenta API
      try {
        const res = await fetch(`/api/rosters?season_id=${season?.id}`);
        if (res.ok) return res.json();
      } catch (e) {}

      // 2. Fallback Supabase Real Schema
      const { data: seasonTeams } = await supabase
        .from('season_teams')
        .select('team:teams(*)')
        .eq('season_id', season?.id);

      if (!seasonTeams) return [];

      const teamIds = seasonTeams.map((st: any) => st.team.id);
      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')
        .in('team_id', teamIds);

      return seasonTeams.map((st: any) => ({
        ...st.team,
        players: (allPlayers || []).filter((p: any) => p.team_id === st.team.id)
      }));
    },
    enabled: !!season?.id
  });

  const filteredTeams = (teams || []).filter((t: any) => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.players.some((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (ctxLoading || queryLoading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" size={40} color="var(--primary-color)" /></div>;

  return (
    <div className="page-fluid animate-fade roster-page-container">
      <div className="roster-header-section">
        <h1 className="section-title"><Users /> ELENCOS E ATLETAS</h1>
        <p className="section-subtitle">Confira os jogadores inscritos em cada equipe para esta temporada.</p>
      </div>

      <div className="search-wrapper">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por time ou jogador..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="roster-search-input"
        />
      </div>

      <div className="roster-grid">
        {filteredTeams.map((team: any) => (
          <div key={team.id} className={`roster-team-card ${expandedTeamId === team.id ? 'expanded' : ''}`}>
            <div 
              className="roster-team-header"
              onClick={() => setExpandedTeamId(expandedTeamId === team.id ? null : team.id)}
            >
              <div className="team-info-group">
                <div className="team-logo-bg">
                  <img src={team.logo_url} alt="" loading="lazy" />
                </div>
                <div className="team-text-group">
                  <h3 className="team-name">{team.name}</h3>
                  <span className="player-count">{team.players.length} ATLETAS</span>
                </div>
              </div>
              <div className="chevron-icon">
                {expandedTeamId === team.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>
            </div>

            {expandedTeamId === team.id && (
              <div className="roster-player-list animate-fade">
                {team.players.length === 0 ? (
                  <div className="no-players-msg">Nenhum jogador cadastrado.</div>
                ) : (
                  team.players.map((p: any) => (
                    <PlayerItem key={p.id} p={p} onClick={() => setSelectedPlayer(p)} />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPlayer && <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}

      <style>{`
        .roster-page-container { max-width: 1400px; margin: 0 auto; padding: 40px 20px; }
        .roster-header-section { text-align: center; margin-bottom: 3rem; }
        .section-subtitle { color: var(--text-muted); font-size: 1rem; margin-top: 0.5rem; }
        .search-wrapper { position: relative; max-width: 800px; margin: 0 auto 3rem; }
        .search-icon { position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .roster-search-input { width: 100%; padding: 1.25rem 1.25rem 1.25rem 3.5rem; border-radius: 20px; background: var(--card-bg); border: 1px solid var(--border-color); font-weight: 700; font-size: 1rem; color: var(--text-main); box-shadow: 0 4px 15px rgba(0,0,0,0.02); transition: all 0.2s; }
        .roster-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
        @media (min-width: 1024px) { .roster-grid { grid-template-columns: repeat(2, 1fr); } }
        .roster-team-card { background: var(--card-bg); border-radius: 24px; border: 1px solid var(--border-color); overflow: hidden; transition: all 0.3s ease; height: fit-content; }
        .roster-team-card.expanded { border-color: var(--primary-color); box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
        .roster-team-header { padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
        .team-info-group { display: flex; align-items: center; gap: 1.25rem; }
        .team-logo-bg { background: var(--surface-alt); padding: 10px; border-radius: 16px; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; }
        .team-logo-bg img { width: 100%; height: 100%; object-fit: contain; }
        .team-name { font-size: 1.25rem; font-weight: 950; color: var(--text-main); margin: 0; }
        .player-count { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
        .roster-player-list { border-top: 1px solid var(--border-color); background: var(--surface-alt); }
        .roster-player-item { display: flex; align-items: center; padding: 12px 20px; gap: 15px; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid rgba(0,0,0,0.03); }
        .roster-player-item:hover { background: var(--card-bg); padding-left: 28px; }
        .player-avatar { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; background: var(--card-bg); border: 1px solid var(--border-color); }
        .player-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .player-num { font-weight: 900; color: var(--primary-color); font-size: 0.9rem; width: 30px; }
        .player-name { flex: 1; font-weight: 700; color: var(--text-main); font-size: 0.95rem; }
        .player-pos-badge { font-size: 0.65rem; font-weight: 900; background: var(--card-bg); color: var(--text-muted); padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }
        @media (max-width: 768px) { .roster-page-container { padding: 20px 15px; } .team-name { font-size: 1.1rem; } }
      `}</style>
    </div>
  );
}
