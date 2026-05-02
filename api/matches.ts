import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

export default async function handler(req: any, res: any) {
  const { season_id, status, limit } = req.query;
  
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  try {
    let query = supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(*)');

    if (season_id) query = query.eq('season_id', season_id);
    if (status) query = query.eq('status', status);
    
    query = query.order('date', { ascending: status === 'agendado' }).order('time', { ascending: true });
    
    if (limit) query = query.limit(parseInt(limit));

    const { data, error } = await query;

    if (error) throw error;
    
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
