import { supabase } from '../supabaseClient';
import type { Match, MatchEvent, Stage } from '../types';

// ─── Stages ──────────────────────────────────────────────────

export async function getStagesBySeason(seasonId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .eq('season_id', seasonId)
    .order('order_index');
  if (error) throw error;
  return data || [];
}

// ─── Matches ─────────────────────────────────────────────────

export async function getMatchesBySeason(seasonId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(id, name, short_name, logo_url), away_team:teams!away_team_id(id, name, short_name, logo_url), stage:stages(id, name, type, order_index)')
    .eq('season_id', seasonId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getMatchesByStage(stageId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(id, name, short_name, logo_url), away_team:teams!away_team_id(id, name, short_name, logo_url), stage:stages(id, name, type)')
    .eq('stage_id', stageId)
    .order('round')
    .order('date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getMatchById(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), stage:stages(id, name, type)')
    .eq('id', matchId)
    .single();
  if (error) return null;
  return data;
}

export async function getNextMatches(seasonId: string, limit = 5): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(id, name, short_name, logo_url), away_team:teams!away_team_id(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .eq('status', 'agendado')
    .order('date', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getRecentResults(seasonId: string, limit = 4): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*, home_team:teams!home_team_id(id, name, short_name, logo_url), away_team:teams!away_team_id(id, name, short_name, logo_url)')
    .eq('season_id', seasonId)
    .eq('status', 'finalizado')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ─── Match Events ────────────────────────────────────────────

export async function getEventsByMatch(matchId: string): Promise<MatchEvent[]> {
  const { data, error } = await supabase
    .from('match_events')
    .select('*, player:players!player_id(id, name, shirt_number, photo_url, team_id), assist_player:players!assist_player_id(id, name, shirt_number)')
    .eq('match_id', matchId)
    .order('minute', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ─── Admin: Match Management ─────────────────────────────────

export async function updateMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  homePenalties: number | null,
  awayPenalties: number | null,
  winnerId: string | null,
  status: 'finalizado' | 'agendado' = 'finalizado'
) {
  const { error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      home_penalties: homePenalties,
      away_penalties: awayPenalties,
      winner_id: winnerId,
      status,
    })
    .eq('id', matchId);
  if (error) throw error;
}

export async function resetMatch(matchId: string) {
  // Delete all events
  const { error: evError } = await supabase
    .from('match_events')
    .delete()
    .eq('match_id', matchId);
  if (evError) throw evError;

  // Reset match
  const { error: mError } = await supabase
    .from('matches')
    .update({
      home_score: null,
      away_score: null,
      home_penalties: null,
      away_penalties: null,
      winner_id: null,
      status: 'agendado',
    })
    .eq('id', matchId);
  if (mError) throw mError;
}

export async function addMatchEvent(
  matchId: string,
  playerId: string,
  teamId: string,
  type: string,
  minute: number | null,
  assistPlayerId: string | null
) {
  const { error } = await supabase.from('match_events').insert([{
    match_id: matchId,
    player_id: playerId,
    team_id: teamId,
    type,
    minute,
    assist_player_id: assistPlayerId,
  }]);
  if (error) throw error;
}

export async function deleteMatchEvent(eventId: string) {
  const { error } = await supabase
    .from('match_events')
    .delete()
    .eq('id', eventId);
  if (error) throw error;
}
