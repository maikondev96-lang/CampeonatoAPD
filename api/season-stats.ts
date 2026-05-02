import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  const { season_id } = req.query;
  if (!season_id) return res.status(400).json({ error: 'Missing season_id' });

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const [
      { count: teamsCount },
      { count: matchesCount },
      { count: playersCount }
    ] = await Promise.all([
      supabase.from('season_teams').select('*', { count: 'exact', head: true }).eq('season_id', season_id),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', season_id),
      supabase.from('players').select('id', { count: 'exact', head: true }).in('team_id', 
        (await supabase.from('season_teams').select('team_id').eq('season_id', season_id)).data?.map(t => t.team_id) || []
      )
    ]);
    
    return res.status(200).json({
      teams: teamsCount || 0,
      matches: matchesCount || 0,
      players: playersCount || 0
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
