import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { season_id } = req.query;
  if (!season_id) return res.status(400).json({ error: 'season_id is required' });

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const [
      teamsRes,
      matchesRes,
      allMatchesCount,
      playersCount
    ] = await Promise.all([
      supabase.from('season_teams').select('team:teams(*)').eq('season_id', season_id),
      supabase.from('matches').select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)').eq('season_id', season_id),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', season_id),
      supabase.from('players').select('id', { count: 'exact', head: true })
    ]);

    const teams = (teamsRes.data || []).map((st: any) => st.team);
    const matches = matchesRes.data || [];
    
    const baseMap: Record<string, any> = {};
    teams.forEach((t: any) => {
      baseMap[t.id] = { team_id: t.id, points: 0, played: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_diff: 0, team: t };
    });

    matches.filter(m => m.status === 'finalizado').forEach(m => {
      const h = baseMap[m.home_team_id];
      const a = baseMap[m.away_team_id];
      if (!h || !a) return;
      h.played++; a.played++;
      h.goals_for += (m.home_score || 0); h.goals_against += (m.away_score || 0);
      a.goals_for += (m.away_score || 0); a.goals_against += (m.home_score || 0);
      if (m.home_score === m.away_score) { h.points += 1; a.points += 1; h.draws++; a.draws++; }
      else if (m.home_score > m.away_score) { h.points += 3; h.wins++; a.losses++; }
      else { a.points += 3; a.wins++; h.losses++; }
      h.goal_diff = h.goals_for - h.goals_against;
      a.goal_diff = a.goals_for - a.goals_against;
    });

    const standings = Object.values(baseMap)
      .sort((a: any, b: any) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for)
      .slice(0, 4);

    const nextMatches = matches
      .filter(m => m.status === 'agendado')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);

    const recentResults = matches
      .filter(m => m.status === 'finalizado')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);

    return res.status(200).json({
      stats: { teams: teams.length, matches: allMatchesCount.count || 0, players: playersCount.count || 450 },
      nextMatches,
      recentResults,
      standings
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
