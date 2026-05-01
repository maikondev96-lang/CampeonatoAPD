import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Activity, Loader2, Medal, Users, Footprints, 
  ChevronDown, ChevronUp, Shield, Flame, Zap, ScrollText, AlertTriangle 
} from 'lucide-react';
import { useSeasonContext } from '../components/SeasonContext';

interface PlayerStat {
  id: string;
  name: string;
  team_name: string;
  team_logo: string;
  gols: number;
  assistencias: number;
  yellow_cards: number;
  red_cards: number;
  position?: string;
  photo_url?: string;
  goals_conceded?: number;
  matches_played?: number;
}

interface TeamStat {
  id: string;
  name: string;
  logo: string;
  goals_scored: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
}

const Artilharia = () => {
  const { season, loading: ctxLoading } = useSeasonContext();
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeIndivTab, setActiveIndivTab] = useState<'gols' | 'assistencias' | 'goleiros'>('gols');

  useEffect(() => {
    if (season) fetchStats();
  }, [season]);

  const fetchStats = async () => {
    if (!season) return;
    try {
      // Get teams enrolled in this season
      const { data: seasonTeamsData } = await supabase
        .from('season_teams')
        .select('team_id, team:teams(*)')
        .eq('season_id', season.id);
      const enrolledTeamIds = (seasonTeamsData || []).map(st => st.team_id);

      const [
        { data: players },
        { data: matches },
        { data: events }
      ] = await Promise.all([
        supabase.from('players').select('*, team:teams(*)').in('team_id', enrolledTeamIds),
        supabase.from('matches').select('*').eq('season_id', season.id).eq('status', 'finalizado'),
        supabase.from('match_events').select('*, match:matches!inner(season_id)').eq('match.season_id', season.id)
      ]);
      const teams = (seasonTeamsData || []).map((st: any) => st.team).filter(Boolean);

      if (players && teams && matches && events) {
        // --- Process Player Stats ---
        // --- Process Player Stats (Regra Brasileirão) ---
        const pMap: Record<string, PlayerStat> = {};
        players.forEach(p => {
          pMap[p.id] = { 
            id: p.id, name: p.name, team_name: p.team?.name || 'Sem Time', team_logo: p.team?.logo_url || '', 
            gols: 0, assistencias: 0, yellow_cards: 0, red_cards: 0, position: p.position, photo_url: p.photo_url,
            goals_conceded: 0, matches_played: 0 
          };
        });

        // 1. Gols e Assistências (Geral)
        events.forEach(ev => {
          if ((ev.type === 'gol' || ev.type === 'gol_penalti') && pMap[ev.player_id]) pMap[ev.player_id].gols++;
          if (ev.assist_player_id && pMap[ev.assist_player_id]) pMap[ev.assist_player_id].assistencias++;
        });

        // 2. Cartões com Regra de Acúmulo (Por Partida)
        matches.forEach(m => {
          const matchEvents = events.filter(e => e.match_id === m.id);
          
          players.forEach(p => {
            const pEvents = matchEvents.filter(e => e.player_id === p.id);
            const hasIndirectRed = pEvents.some(e => e.type === 'cartao_vermelho_indireto');
            const hasDirectRed = pEvents.some(e => e.type === 'cartao_vermelho_direto');
            const yellowCount = pEvents.filter(e => e.type === 'cartao_amarelo').length;

            if (hasIndirectRed) {
              pMap[p.id].red_cards++;
              // Regra Brasileirão: 2 amarelos na mesma partida = 0 amarelos pro acumulado
            } else {
              if (hasDirectRed) pMap[p.id].red_cards++;
              pMap[p.id].yellow_cards += yellowCount;
            }
          });
        });

        setPlayerStats(Object.values(pMap));

        // --- Process Team Stats ---
        const tMap: Record<string, TeamStat> = {};
        teams.forEach(t => {
          tMap[t.id] = {
            id: t.id,
            name: t.name,
            logo: t.logo_url,
            goals_scored: 0,
            goals_conceded: 0,
            yellow_cards: 0,
            red_cards: 0,
          };
        });

        matches.forEach(m => {
          if (tMap[m.home_team_id]) {
            tMap[m.home_team_id].goals_scored += m.home_score || 0;
            tMap[m.home_team_id].goals_conceded += m.away_score || 0;
            
            // Add matches and goals conceded to goalkeepers
            players.filter(p => p.team_id === m.home_team_id && p.position === 'GOL').forEach(gk => {
              if (pMap[gk.id]) {
                pMap[gk.id].matches_played = (pMap[gk.id].matches_played || 0) + 1;
                pMap[gk.id].goals_conceded = (pMap[gk.id].goals_conceded || 0) + (m.away_score || 0);
              }
            });
          }
          if (tMap[m.away_team_id]) {
            tMap[m.away_team_id].goals_scored += m.away_score || 0;
            tMap[m.away_team_id].goals_conceded += m.home_score || 0;
            
            // Add matches and goals conceded to goalkeepers
            players.filter(p => p.team_id === m.away_team_id && p.position === 'GOL').forEach(gk => {
              if (pMap[gk.id]) {
                pMap[gk.id].matches_played = (pMap[gk.id].matches_played || 0) + 1;
                pMap[gk.id].goals_conceded = (pMap[gk.id].goals_conceded || 0) + (m.home_score || 0);
              }
            });
          }
        });

        // Sum team cards from player cards
        Object.values(pMap).forEach(pStat => {
          const team = players.find(p => p.id === pStat.id)?.team_id;
          if (team && tMap[team]) {
            tMap[team].yellow_cards += pStat.yellow_cards;
            tMap[team].red_cards += pStat.red_cards;
          }
        });

        setTeamStats(Object.values(tMap));
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const Section = ({ 
    id, title, subtitle, icon: Icon, color, data, renderItem, valueLabel, extraHeader 
  }: { 
    id: string, title: string, subtitle?: string, icon: any, color: string, data: any[], renderItem: (item: any, idx: number) => React.ReactNode, valueLabel: string, extraHeader?: React.ReactNode
  }) => {
    const isExpanded = expandedSection === id;
    const top3 = data.slice(0, 3);

    return (
      <div className="card" style={{ padding: 0, marginBottom: '1.25rem', overflow: 'hidden', borderLeft: `6px solid ${color}` }}>
        <button 
          onClick={() => toggleSection(id)}
          style={{ 
            width: '100%', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', 
            alignItems: 'center', background: 'var(--card-bg)', border: 'none', cursor: 'pointer', color: 'inherit' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '10px', background: `${color}15`, borderRadius: '12px', color }}>
              <Icon size={24} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 950, color: 'var(--primary-dark)', textTransform: 'uppercase', lineHeight: 1 }}>{title}</h3>
              {subtitle && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, marginTop: '2px', opacity: 0.8, textTransform: 'uppercase' }}>{subtitle}</p>}
              {!isExpanded && top3.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '4px' }}>
                  Líder: {top3[0].name} ({top3[0].value} {valueLabel})
                </p>
              )}
            </div>
          </div>
          {isExpanded ? <ChevronUp size={24} color="var(--text-muted)" /> : <ChevronDown size={24} color="var(--text-muted)" />}
        </button>

        {isExpanded && (
          <div style={{ padding: '0 1.5rem 1.5rem', background: 'var(--surface-alt)', borderTop: '2px solid var(--border-color)' }}>
            {extraHeader}
            <table className="standings-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', background: 'transparent' }}>#</th>
                  <th style={{ background: 'transparent' }}>Nome</th>
                  {valueLabel && <th style={{ background: 'transparent', textAlign: 'right' }}>{valueLabel}</th>}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Nenhum dado registrado</td></tr>
                ) : data.slice(0, 15).map((item, idx) => renderItem(item, idx))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading || ctxLoading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  const scorers = [...playerStats].sort((a, b) => b.gols - a.gols || b.assistencias - a.assistencias).map(s => ({ ...s, value: s.gols }));
  const assisters = [...playerStats].sort((a, b) => b.assistencias - a.assistencias || b.gols - a.gols).map(s => ({ ...s, value: s.assistencias }));
  const goalkeepers = [...playerStats]
    .filter(s => s.position === 'GOL' && (s.matches_played || 0) > 0)
    .map(s => ({ 
      ...s, 
      value: ((s.goals_conceded || 0) / (s.matches_played || 1)).toFixed(2),
      raw_value: ((s.goals_conceded || 0) / (s.matches_played || 1))
    }))
    .sort((a, b) => a.raw_value - b.raw_value);
  const bestAttack = [...teamStats].sort((a, b) => b.goals_scored - a.goals_scored).map(s => ({ ...s, value: s.goals_scored }));
  const bestDefense = [...teamStats].sort((a, b) => a.goals_conceded - b.goals_conceded).map(s => ({ ...s, value: s.goals_conceded }));
  
  const playerCards = [...playerStats]
    .map(s => ({ ...s, value: (s.yellow_cards + s.red_cards * 2) }))
    .sort((a, b) => b.value - a.value);

  const teamCards = [...teamStats]
    .map(s => ({ ...s, value: (s.yellow_cards + s.red_cards * 2) }))
    .sort((a, b) => b.value - a.value);

  const renderPlayer = (p: any, idx: number) => (
    <tr key={p.id}>
      <td style={{ fontWeight: 900, color: 'var(--text-muted)' }}>{idx + 1}º</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {p.photo_url ? (
            <img src={p.photo_url} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '50%' }} />
          ) : p.team_logo ? (
            <img src={p.team_logo} style={{ width: 36, height: 36, objectFit: 'contain' }} />
          ) : null}
          <div>
            <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{p.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {p.team_name} {p.position && `• ${p.position}`}
            </div>
          </div>
        </div>
      </td>
      <td style={{ textAlign: 'right', fontWeight: 950, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>{p.value}</td>
    </tr>
  );

  const renderTeam = (t: any, idx: number) => (
    <tr key={t.id}>
      <td style={{ fontWeight: 900, color: 'var(--text-muted)' }}>{idx + 1}º</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src={t.logo} style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{t.name}</div>
        </div>
      </td>
      <td style={{ textAlign: 'right', fontWeight: 950, fontSize: '1.2rem', color: 'var(--primary-dark)' }}>{t.value}</td>
    </tr>
  );

  const renderPlayerCards = (p: any, idx: number) => (
    <tr key={p.id}>
      <td style={{ fontWeight: 900, color: 'var(--text-muted)' }}>{idx + 1}º</td>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{p.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{p.team_name}</div>
          </div>
        </div>
      </td>
      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 900, color: '#eab308' }}>
            <div style={{ width: 10, height: 14, background: '#eab308', borderRadius: '2px' }}></div> {p.yellow_cards}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 900, color: '#ef4444' }}>
            <div style={{ width: 10, height: 14, background: '#ef4444', borderRadius: '2px' }}></div> {p.red_cards}
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="page-fluid animate-fade">
      <h1 className="section-title"><Zap /> Centro de Estatísticas {season && <span style={{ fontSize: '0.6em', color: 'var(--text-muted)', fontWeight: 600 }}>{season.year}</span>}</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Destaques Individuais</p>
        
        <Section 
          id="ranking" 
          title={activeIndivTab === 'gols' ? 'Artilharia' : activeIndivTab === 'assistencias' ? 'Assistências' : 'Melhor Goleiro'} 
          icon={activeIndivTab === 'gols' ? () => <span>⚽</span> : activeIndivTab === 'assistencias' ? Footprints : Shield} 
          color={activeIndivTab === 'gols' ? '#059669' : activeIndivTab === 'assistencias' ? '#b89112' : '#3b82f6'} 
          data={activeIndivTab === 'gols' ? scorers : activeIndivTab === 'assistencias' ? assisters : goalkeepers} 
          renderItem={renderPlayer} 
          valueLabel={activeIndivTab === 'gols' ? 'Gols' : activeIndivTab === 'assistencias' ? 'Assists' : 'Média (Gols/Jogo)'}
          extraHeader={
            <div className="tabs-container" style={{ marginBottom: '1rem', marginTop: '1rem', width: '100%', gap: '4px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndivTab('gols'); }}
                className={`tab-btn ${activeIndivTab === 'gols' ? 'active' : ''}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', fontSize: '0.75rem' }}
              >
                ⚽ GOLS
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndivTab('assistencias'); }}
                className={`tab-btn ${activeIndivTab === 'assistencias' ? 'active' : ''}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', fontSize: '0.75rem' }}
              >
                <Footprints size={14} /> ASSISTS
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndivTab('goleiros'); }}
                className={`tab-btn ${activeIndivTab === 'goleiros' ? 'active' : ''}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', fontSize: '0.75rem' }}
              >
                <Shield size={14} /> GOLEIROS
              </button>
            </div>
          }
        />

        <Section 
          id="cards-player" 
          title="Mais Indisciplinados" 
          subtitle="Histórico de cartões por jogador"
          icon={AlertTriangle} 
          color="#ef4444" 
          data={playerCards} renderItem={renderPlayerCards} valueLabel="Cartões" 
        />
      </div>

      <div style={{ marginBottom: '4rem' }}>
        <p style={{ fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Performance por Equipe</p>
        <Section 
          id="ataque" title="Melhor Ataque" icon={Flame} color="#f97316" 
          data={bestAttack} renderItem={renderTeam} valueLabel="Gols" 
        />
        <Section 
          id="defesa" title="Melhor Defesa" icon={Shield} color="#3b82f6" 
          data={bestDefense} renderItem={renderTeam} valueLabel="Gols" 
        />
        <Section 
          id="cards-team" title="Cartões por Equipe" icon={ScrollText} color="#475569" 
          data={teamCards} renderItem={(t, idx) => (
            <tr key={t.id}>
              <td style={{ fontWeight: 900, color: 'var(--text-muted)' }}>{idx + 1}º</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={t.logo} style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{t.name}</div>
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 900, color: '#eab308' }}>
                    <div style={{ width: 12, height: 16, background: '#eab308', borderRadius: '2px' }}></div> {t.yellow_cards}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', fontWeight: 900, color: '#ef4444' }}>
                    <div style={{ width: 12, height: 16, background: '#ef4444', borderRadius: '2px' }}></div> {t.red_cards}
                  </div>
                </div>
              </td>
            </tr>
          )} valueLabel="Cartões" 
        />
      </div>
    </div>
  );
};

export default Artilharia;
