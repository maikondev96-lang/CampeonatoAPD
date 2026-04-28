import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Activity, Loader2, Goal, Medal, Users, HandHeart, 
  ChevronDown, ChevronUp, Shield, Flame, Zap, ScrollText, AlertTriangle 
} from 'lucide-react';

interface PlayerStat {
  id: string;
  name: string;
  team_name: string;
  team_logo: string;
  gols: number;
  assistencias: number;
  yellow_cards: number;
  red_cards: number;
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
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('ranking');
  const [activeIndivTab, setActiveIndivTab] = useState<'gols' | 'assistencias'>('gols');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [
        { data: players },
        { data: teams },
        { data: matches },
        { data: events }
      ] = await Promise.all([
        supabase.from('players').select('*, team:teams(*)'),
        supabase.from('teams').select('*'),
        supabase.from('matches').select('*').eq('status', 'finalizado'),
        supabase.from('match_events').select('*')
      ]);

      if (players && teams && matches && events) {
        // --- Process Player Stats ---
        const pMap: Record<string, PlayerStat> = {};
        players.forEach(p => {
          pMap[p.id] = {
            id: p.id,
            name: p.name,
            team_name: p.team?.name || 'Sem Time',
            team_logo: p.team?.logo_url || '',
            gols: 0,
            assistencias: 0,
            yellow_cards: 0,
            red_cards: 0,
          };
        });

        events.forEach(ev => {
          if (ev.type === 'gol' && pMap[ev.player_id]) pMap[ev.player_id].gols++;
          if (ev.assist_player_id && pMap[ev.assist_player_id]) pMap[ev.assist_player_id].assistencias++;
          if (ev.type === 'amarelo' && pMap[ev.player_id]) pMap[ev.player_id].yellow_cards++;
          if (ev.type === 'vermelho' && pMap[ev.player_id]) pMap[ev.player_id].red_cards++;
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
          }
          if (tMap[m.away_team_id]) {
            tMap[m.away_team_id].goals_scored += m.away_score || 0;
            tMap[m.away_team_id].goals_conceded += m.home_score || 0;
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
            alignItems: 'center', background: 'white', border: 'none', cursor: 'pointer' 
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
          <div style={{ padding: '0 1.5rem 1.5rem', background: '#f8fafc', borderTop: '2px solid #edf2f7' }}>
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

  if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}><Loader2 className="animate-spin" /></div>;

  const scorers = [...playerStats].sort((a, b) => b.gols - a.gols || b.assistencias - a.assistencias).map(s => ({ ...s, value: s.gols }));
  const assisters = [...playerStats].sort((a, b) => b.assistencias - a.assistencias || b.gols - a.gols).map(s => ({ ...s, value: s.assistencias }));
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
          {p.team_logo && <img src={p.team_logo} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontWeight: 800, color: 'var(--primary-dark)' }}>{p.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{p.team_name}</div>
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
    <div className="animate-fade container" style={{ maxWidth: '800px' }}>
      <h1 className="section-title"><Zap /> Centro de Estatísticas</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Destaques Individuais</p>
        
        <Section 
          id="ranking" 
          title={activeIndivTab === 'gols' ? 'Artilharia' : 'Assistências'} 
          icon={activeIndivTab === 'gols' ? Goal : HandHeart} 
          color={activeIndivTab === 'gols' ? '#059669' : '#b89112'} 
          data={activeIndivTab === 'gols' ? scorers : assisters} 
          renderItem={renderPlayer} 
          valueLabel={activeIndivTab === 'gols' ? 'Gols' : 'Assists'}
          extraHeader={
            <div className="tabs-container" style={{ marginBottom: '1rem', marginTop: '1rem', width: '100%' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndivTab('gols'); }}
                className={`tab-btn ${activeIndivTab === 'gols' ? 'active' : ''}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Goal size={16} /> GOLS
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveIndivTab('assistencias'); }}
                className={`tab-btn ${activeIndivTab === 'assistencias' ? 'active' : ''}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <HandHeart size={16} /> ASSISTÊNCIAS
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
