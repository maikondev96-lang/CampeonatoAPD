import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  const { season_id, limit } = req.query;
  if (!season_id) return res.status(400).json({ error: 'Missing season_id' });

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const [teamsRes, matchesRes] = await Promise.all([
      supabase.from('season_teams').select('team:teams(*)').eq('season_id', season_id),
      supabase.from('matches').select('*').eq('season_id', season_id).eq('status', 'finalizado')
    ]);

    const baseMap: Record<string, any> = {};
    (teamsRes.data || []).forEach((st: any) => { 
      const t = st.team; 
      baseMap[t.id] = { team_id: t.id, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, points: 0, team: t }; 
    });

    (matchesRes.data || []).forEach(m => { 
      const h = baseMap[m.home_team_id]; 
      const a = baseMap[m.away_team_id]; 
      if (!h || !a) return; 
      h.played++; a.played++; 
      h.goals_for += m.home_score || 0; h.goals_against += m.away_score || 0; 
      a.goals_for += m.away_score || 0; a.goals_against += m.home_score || 0; 
      if (m.home_score === m.away_score) { h.points += 1; a.points += 1; } 
      else if ((m.home_score || 0) > (m.away_score || 0)) { h.points += 3; h.wins++; a.losses++; } 
      else { a.points += 3; a.wins++; h.losses++; } 
      h.goal_diff = h.goals_for - h.goals_against;
      a.goal_diff = a.goals_for - a.goals_against;
    });

    const sorted = Object.values(baseMap).sort((a: any, b: any) => 
      b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for
    );

    return res.status(200).json(limit ? sorted.slice(0, parseInt(limit)) : sorted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
