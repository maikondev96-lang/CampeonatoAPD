import { supabase } from '../supabaseClient';
import type { Standing, PlayerStatsBySeason } from '../types';

// ─── Standings ───────────────────────────────────────────────

export async function getStandingsBySeason(seasonId: string): Promise<Standing[]> {
  const { data, error } = await supabase
    .from('standings')
    .select('*, team:teams(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_for', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ─── Player Stats ────────────────────────────────────────────

export async function getTopScorersBySeason(seasonId: string, limit = 20): Promise<PlayerStatsBySeason[]> {
  const { data, error } = await supabase
    .from('player_stats_by_season')
    .select('*, player:players(id, name, shirt_number, photo_url), team:teams(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .gt('goals', 0)
    .order('goals', { ascending: false })
    .order('assists', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getTopAssistsBySeason(seasonId: string, limit = 20): Promise<PlayerStatsBySeason[]> {
  const { data, error } = await supabase
    .from('player_stats_by_season')
    .select('*, player:players(id, name, shirt_number, photo_url), team:teams(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .gt('assists', 0)
    .order('assists', { ascending: false })
    .order('goals', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getDisciplineBySeason(seasonId: string, limit = 20): Promise<PlayerStatsBySeason[]> {
  const { data, error } = await supabase
    .from('player_stats_by_season')
    .select('*, player:players(id, name, shirt_number, photo_url), team:teams(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .order('red_cards', { ascending: false })
    .order('yellow_cards', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).filter(s => s.yellow_cards > 0 || s.red_cards > 0);
}

export async function getBestDefenseBySeason(seasonId: string): Promise<Standing[]> {
  const { data, error } = await supabase
    .from('standings')
    .select('*, team:teams(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .gt('played', 0)
    .order('goals_against', { ascending: true })
    .limit(10);
  if (error) throw error;
  return data || [];
}

// ─── Recalculate stats (calls DB function) ───────────────────

export async function recalculatePlayerStats(seasonId: string) {
  const { error } = await supabase.rpc('recalculate_player_stats', {
    p_season_id: seasonId,
  });
  if (error) throw error;
}
