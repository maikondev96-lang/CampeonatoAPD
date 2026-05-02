import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  const { season_id } = req.query;
  if (!season_id) return res.status(400).json({ error: 'season_id is required' });

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    const { data: stData } = await supabase
      .from('season_teams')
      .select('team:teams(*)')
      .eq('season_id', season_id);
    
    const teamList = stData?.map((st: any) => st.team).filter(Boolean) || [];
    const teamIds = teamList.map(t => t.id);

    const { data: pData } = await supabase
      .from('players')
      .select('*')
      .in('team_id', teamIds)
      .order('shirt_number', { ascending: true });

    const rosters = teamList.map(t => ({
      ...t,
      players: (pData || []).filter(p => p.team_id === t.id)
    })).sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json(rosters);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
