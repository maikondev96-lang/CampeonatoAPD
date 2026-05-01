import { supabase } from '../supabaseClient';
import { Stage, Match, Season, Competition } from '../types';

export const checkAndGenerateNextStages = async (seasonId: string) => {
  // 1. Fetch Season and Competition Rules
  const { data: season } = await supabase
    .from('seasons')
    .select('*, competition:competitions(*)')
    .eq('id', seasonId)
    .single();

  if (!season) return { success: false, message: 'Temporada não encontrada.' };

  const comp = season.competition as Competition;
  const rules = (comp.rules_json as any) || { format: 'league_top_4' }; // Default fallback

  // 2. Fetch all stages and matches for this season
  const { data: stages } = await supabase.from('stages').select('*').eq('season_id', seasonId).order('order_index');
  const { data: matches } = await supabase.from('matches').select('*').eq('season_id', seasonId).order('id');

  if (!stages || !matches) return { success: false, message: 'Erro ao buscar dados.' };

  const groupStage = stages.find(s => s.type === 'group' || s.type === 'league_round');
  const semiStage = stages.find(s => s.type === 'semi');
  const finalStage = stages.find(s => s.type === 'final');
  
  let generatedSomething = false;

  // ── REGLA 1: GERAR SEMIFINAIS (Se Fase de Grupos Finalizou e Semi não existe) ──
  if (groupStage) {
    const groupMatches = matches.filter(m => m.stage_id === groupStage.id);
    const allGroupMatchesFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finalizado');

    if (allGroupMatchesFinished) {
      if (rules.format === 'league_top_4') {
        const { data: standings } = await supabase.from('standings').select('team_id, points, goal_diff, goals_for').eq('season_id', seasonId);
        
        if (standings && standings.length >= 4) {
          const sorted = [...standings].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
            return b.goals_for - a.goals_for;
          });

          const top1 = sorted[0].team_id;
          const top2 = sorted[1].team_id;
          const top3 = sorted[2].team_id;
          const top4 = sorted[3].team_id;

          let targetSemiStage = semiStage;
          if (!targetSemiStage) {
            const { data: newSemiStage } = await supabase.from('stages').insert([{ season_id: seasonId, name: 'Semifinal', type: 'semi', order_index: 2 }]).select().single();
            targetSemiStage = newSemiStage;
          }
          
          if (targetSemiStage) {
            const existingSemis = matches.filter(m => m.stage_id === targetSemiStage?.id);
            if (existingSemis.length === 0) {
              const semis = [
                { season_id: seasonId, stage_id: targetSemiStage.id, home_team_id: top1, away_team_id: top4, round: 100, status: 'agendado' },
                { season_id: seasonId, stage_id: targetSemiStage.id, home_team_id: top2, away_team_id: top3, round: 100, status: 'agendado' }
              ];
              await supabase.from('matches').insert(semis);
              generatedSomething = true;
            }
          }
        }
      } else if (rules.format === 'groups_2_top_2') {
        // Lógica para 2 grupos -> Semifinais (1A vs 2B, 1B vs 2A)
        const { data: standings } = await supabase.from('standings').select('team_id, points, goal_diff, goals_for, team:teams!inner(id, name), season_team:season_teams!inner(group_name)').eq('season_id', seasonId);
        
        if (standings) {
          const groupA = standings.filter((s: any) => s.season_team.group_name === 'A').sort((a: any, b: any) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);
          const groupB = standings.filter((s: any) => s.season_team.group_name === 'B').sort((a: any, b: any) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);

          if (groupA.length >= 2 && groupB.length >= 2) {
             let targetSemiStage = semiStage;
             if (!targetSemiStage) {
               const { data: newSemiStage } = await supabase.from('stages').insert([{ season_id: seasonId, name: 'Semifinal', type: 'semi', order_index: 2 }]).select().single();
               targetSemiStage = newSemiStage;
             }

             if (targetSemiStage) {
               const existingSemis = matches.filter(m => m.stage_id === targetSemiStage?.id);
               if (existingSemis.length === 0) {
                 const semis = [
                   { season_id: seasonId, stage_id: targetSemiStage.id, home_team_id: groupA[0].team_id, away_team_id: groupB[1].team_id, round: 100, status: 'agendado' },
                   { season_id: seasonId, stage_id: targetSemiStage.id, home_team_id: groupB[0].team_id, away_team_id: groupA[1].team_id, round: 100, status: 'agendado' }
                 ];
                 await supabase.from('matches').insert(semis);
                 generatedSomething = true;
               }
             }
          }
        }
      }
    }
  }

  // ── REGLA 2: GERAR FINAIS (Se Semifinais Finalizaram) ──
  // Re-fetch matches to ensure we have the latest semis if they were just generated
  const { data: latestMatches } = await supabase.from('matches').select('*').eq('season_id', seasonId).order('id');
  const allMatches = latestMatches || matches;

  if (semiStage) {
    const semiMatches = allMatches.filter(m => m.stage_id === semiStage.id);
    const allSemiFinished = semiMatches.length === 2 && semiMatches.every(m => m.status === 'finalizado' && m.winner_id);

    if (allSemiFinished) {
      const semi1 = semiMatches[0];
      const semi2 = semiMatches[1];

      const winner1 = semi1.winner_id!;
      const winner2 = semi2.winner_id!;
      const loser1 = semi1.home_team_id === winner1 ? semi1.away_team_id : semi1.home_team_id;
      const loser2 = semi2.home_team_id === winner2 ? semi2.away_team_id : semi2.home_team_id;

      let thirdStage = stages.find(s => s.type === 'third_place');
      if (!thirdStage) {
        const { data: newStage } = await supabase.from('stages').insert([{ season_id: seasonId, name: 'Disputa de 3º Lugar', type: 'third_place', order_index: 3 }]).select().single();
        thirdStage = newStage;
      }
      
      let targetFinalStage = finalStage;
      if (!targetFinalStage) {
        const { data: newFinalStage } = await supabase.from('stages').insert([{ season_id: seasonId, name: 'Final', type: 'final', order_index: 4 }]).select().single();
        targetFinalStage = newFinalStage;
      }

      if (thirdStage && targetFinalStage) {
        const existingThirds = allMatches.filter(m => m.stage_id === thirdStage?.id);
        const existingFinals = allMatches.filter(m => m.stage_id === targetFinalStage?.id);

        if (existingThirds.length === 0 && existingFinals.length === 0) {
          const finais = [
            { season_id: seasonId, stage_id: thirdStage.id, home_team_id: loser1, away_team_id: loser2, round: 200, status: 'agendado' },
            { season_id: seasonId, stage_id: targetFinalStage.id, home_team_id: winner1, away_team_id: winner2, round: 201, status: 'agendado' }
          ];
          await supabase.from('matches').insert(finais);
          generatedSomething = true;
        } else {
          // Propagate updates if the user is correcting the semifinal
          if (existingThirds.length > 0) {
            await supabase.from('matches').update({ home_team_id: loser1, away_team_id: loser2 }).eq('id', existingThirds[0].id);
          }
          if (existingFinals.length > 0) {
            await supabase.from('matches').update({ home_team_id: winner1, away_team_id: winner2 }).eq('id', existingFinals[0].id);
          }
          generatedSomething = true;
        }
      }
    }
  }

  return { success: true, generated: generatedSomething };
};
