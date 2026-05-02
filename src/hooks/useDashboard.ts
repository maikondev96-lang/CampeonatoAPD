import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { fetchSafe } from '../utils/fetchSafe';
import { logger } from '../utils/logger';

async function fetchFromAPI(seasonId: string) {
  const res = await fetchSafe(`/api/dashboard?season_id=${seasonId}`);
  return res.json();
}

async function fetchFromSupabase(seasonId: string) {
  // Busca os teamIds da season para filtrar corretamente
  const { data: seasonTeamRows } = await supabase
    .from('season_teams')
    .select('team_id')
    .eq('season_id', seasonId);

  const teamIds = (seasonTeamRows || []).map((r: any) => r.team_id);

  // 4 queries paralelas — não seriais
  const [statsRes, nextMatchesRes, recentMatchesRes, standingsRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('season_id', seasonId),

    supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(id,name,logo_url,short_name), away_team:teams!away_team_id(id,name,logo_url,short_name)')
      .eq('season_id', seasonId)
      .eq('status', 'agendado')
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(6),

    supabase
      .from('matches')
      .select('*, home_team:teams!home_team_id(id,name,logo_url,short_name), away_team:teams!away_team_id(id,name,logo_url,short_name)')
      .eq('season_id', seasonId)
      .eq('status', 'finalizado')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(4),

    supabase
      .from('standings')
      .select('*, team:teams(id,name,logo_url,short_name)')
      .eq('season_id', seasonId)
      .order('points', { ascending: false })
      .order('goal_diff', { ascending: false })
      .limit(4),
  ]);

  // playersCount filtrado pelos times desta season (não global)
  const { count: playersCount } = teamIds.length > 0
    ? await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .in('team_id', teamIds)
    : { count: 0 };

  return {
    stats: {
      teams: teamIds.length,
      matches: statsRes.count ?? 0,
      players: playersCount ?? 0,
    },
    nextMatches: nextMatchesRes.data ?? [],
    recentResults: recentMatchesRes.data ?? [],
    standings: standingsRes.data ?? [],
  };
}

export function useDashboard(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', seasonId],
    queryFn: async () => {
      if (!seasonId) return null;

      // Tenta API primeiro. Se falhar por qualquer motivo (rede, 500, 404),
      // cai no fallback do Supabase sem disparar requests duplicados.
      try {
        return await fetchFromAPI(seasonId);
      } catch (e) {
        logger.warn('useDashboard', 'API indisponível, usando Supabase diretamente', e);
        return await fetchFromSupabase(seasonId);
      }
    },
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
    retry: 1,
  });
}
