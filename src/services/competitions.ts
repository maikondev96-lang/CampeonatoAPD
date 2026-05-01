import { supabase } from '../supabaseClient';
import type { Competition, Season } from '../types';

// ─── Competitions ────────────────────────────────────────────

export async function getCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getCompetitionBySlug(slug: string): Promise<Competition | null> {
  const { data, error } = await supabase
    .from('competitions')
    .select('*, seasons(id, year, status, champion_team_id, runner_up_team_id, champion_team:teams!champion_team_id(id, name, logo_url), runner_up_team:teams!runner_up_team_id(id, name, logo_url))')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

// ─── Seasons ─────────────────────────────────────────────────

export async function getSeasonsByCompetition(competitionId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*, competition:competitions(*), champion_team:teams!champion_team_id(id, name, logo_url, short_name), runner_up_team:teams!runner_up_team_id(id, name, logo_url, short_name)')
    .eq('competition_id', competitionId)
    .order('year', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getActiveSeason(competitionId: string): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*, competition:competitions(*)')
    .eq('competition_id', competitionId)
    .eq('status', 'active')
    .single();
  if (error) return null;
  return data;
}

export async function getSeasonByYear(competitionId: string, year: number): Promise<Season | null> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*, competition:competitions(*)')
    .eq('competition_id', competitionId)
    .eq('year', year)
    .single();
  if (error) return null;
  return data;
}
