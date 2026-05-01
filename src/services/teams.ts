import { supabase } from '../supabaseClient';
import type { Team, Player, SeasonTeam } from '../types';

// ─── Teams ───────────────────────────────────────────────────

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function getTeamsBySeason(seasonId: string): Promise<SeasonTeam[]> {
  const { data, error } = await supabase
    .from('season_teams')
    .select('*, team:teams(*)')
    .eq('season_id', seasonId)
    .order('group_name');
  if (error) throw error;
  return data || [];
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*, players(*)')
    .eq('id', teamId)
    .single();
  if (error) return null;
  return data;
}

// ─── Players ─────────────────────────────────────────────────

export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*, team:teams(id, name, logo_url)')
    .eq('team_id', teamId)
    .eq('active', true)
    .order('shirt_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getPlayersByTeamIds(teamIds: string[]): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .in('team_id', teamIds)
    .eq('active', true)
    .order('shirt_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── Admin: Team Management ──────────────────────────────────

export async function createTeam(name: string, shortName: string, logoUrl: string): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ name, short_name: shortName, logo_url: logoUrl }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTeam(teamId: string, updates: Partial<Team>) {
  const { error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId);
  if (error) throw error;
}

export async function enrollTeamInSeason(seasonId: string, teamId: string, groupName?: string) {
  const { error } = await supabase
    .from('season_teams')
    .insert([{ season_id: seasonId, team_id: teamId, group_name: groupName }]);
  if (error) throw error;
}

// ─── Admin: Player Management ────────────────────────────────

export async function createPlayer(player: Omit<Player, 'id' | 'active'>): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert([player])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(playerId: string, updates: Partial<Player>) {
  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId);
  if (error) throw error;
}
