/**
 * Knockout Advancement Logic
 * Promotes teams from standings to the next stage.
 */
import { supabase } from '../supabaseClient';

export const advanceTeamsToKnockout = async (seasonId: string) => {
  // 1. Fetch current standings
  const { data: standings } = await supabase
    .from('standings')
    .select('*, team:teams(id, name)')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .order('goal_diff', { ascending: false })
    .order('goals_for', { ascending: false });

  if (!standings || standings.length < 2) return { error: 'Classificação insuficiente' };

  // 2. Fetch Knockout Stages
  const { data: stages } = await supabase
    .from('stages')
    .select('*')
    .eq('season_id', seasonId)
    .order('order_index', { ascending: true });

  const knockoutStage = stages?.find(s => s.type === 'semi' || s.type === 'quarter');
  if (!knockoutStage) return { error: 'Fase de mata-mata não encontrada' };

  // 3. Logic for Semi-Final (Top 4)
  if (knockoutStage.type === 'semi') {
    const top4 = standings.slice(0, 4);
    if (top4.length < 4) return { error: 'Necessário 4 times classificados para Semi-Final' };

    // Create Semi-Final Matches
    const semiFinals = [
      {
        season_id: seasonId,
        stage_id: knockoutStage.id,
        round: 1,
        phase: 'semifinal',
        home_team_id: top4[0].team_id, // 1st
        away_team_id: top4[3].team_id, // 4th
        status: 'agendado'
      },
      {
        season_id: seasonId,
        stage_id: knockoutStage.id,
        round: 1,
        phase: 'semifinal',
        home_team_id: top4[1].team_id, // 2nd
        away_team_id: top4[2].team_id, // 3rd
        status: 'agendado'
      }
    ];

    const { error } = await supabase.from('matches').insert(semiFinals);
    if (error) return { error: error.message };
  }

  return { success: true };
};
