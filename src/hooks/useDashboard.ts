import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export function useDashboard(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', seasonId],
    queryFn: async () => {
      // 1. Tenta a API de Produção (Vercel)
      try {
        const res = await fetch(`/api/dashboard?season_id=${seasonId}`);
        if (res.ok) return res.json();
      } catch (e) {
        console.warn("API offline, usando fallback Supabase...");
      }

      // 2. Fallback Supabase (Usando a estrutura REAL do banco)
      if (!seasonId) return null;

      const [statsRes, nextMatchesRes, recentMatchesRes, standingsRes] = await Promise.all([
        // Stats resumidos
        supabase.from('matches').select('id', { count: 'exact', head: true }).eq('season_id', seasonId),
        
        // Próximos jogos
        supabase.from('matches')
          .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
          .eq('season_id', seasonId)
          .eq('status', 'agendado')
          .order('date', { ascending: true })
          .order('time', { ascending: true })
          .limit(6),

        // Resultados recentes
        supabase.from('matches')
          .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
          .eq('season_id', seasonId)
          .eq('status', 'finalizado')
          .order('date', { ascending: false })
          .order('time', { ascending: false })
          .limit(4),

        // Tabela REAL (Usando a tabela 'standings' do banco)
        supabase.from('standings')
          .select('*, team:teams(*)')
          .eq('season_id', seasonId)
          .order('points', { ascending: false })
          .order('goal_diff', { ascending: false })
          .limit(4)
      ]);

      // Busca contagem de times e jogadores para o stats
      const { count: teamsCount } = await supabase.from('season_teams').select('id', { count: 'exact', head: true }).eq('season_id', seasonId);
      const { count: playersCount } = await supabase.from('players').select('id', { count: 'exact', head: true });

      return {
        stats: { 
          teams: teamsCount || 0, 
          matches: statsRes.count || 0, 
          players: playersCount || 0 
        },
        nextMatches: nextMatchesRes.data || [],
        recentResults: recentMatchesRes.data || [],
        standings: standingsRes.data || []
      };
    },
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
