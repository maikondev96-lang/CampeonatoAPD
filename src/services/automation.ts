import { supabase } from '../supabaseClient';
import { Stage, Match, Season, Competition } from '../types';

/**
 * Motor de Automação de Fases (Query Engine & Admin Engine Sync)
 * Responsável por propagar resultados e gerar as fases seguintes do torneio.
 */
export const checkAndGenerateNextStages = async (seasonId: string) => {
  // 1. Buscar Temporada e Regras da Competição
  const { data: season } = await supabase
    .from('seasons')
    .select('*, competition:competitions(*)')
    .eq('id', seasonId)
    .single();

  if (!season) return { success: false, message: 'Temporada não encontrada.' };

  const comp = season.competition as Competition;
  const rules = (comp.rules_json as any) || { format: 'league_top_4' };

  // 2. Buscar todas as fases e jogos desta temporada
  const { data: stages } = await supabase.from('stages').select('*').eq('season_id', seasonId).order('order_index');
  const { data: matches } = await supabase.from('matches').select('*').eq('season_id', seasonId).order('id');

  if (!stages || !matches) return { success: false, message: 'Erro ao buscar dados.' };

  const groupStage = stages.find(s => s.type === 'group' || s.type === 'league_round');
  const oitavasStage = stages.find(s => s.type === 'round_of_16');
  const quartasStage = stages.find(s => s.type === 'quarter');
  const semiStage = stages.find(s => s.type === 'semi');
  const finalStage = stages.find(s => s.type === 'final');
  
  let generatedSomething = false;

  // ── REGLA 1: TRANSIÇÃO GRUPOS -> MATA-MATA (Oitavas, Quartas ou Semis) ──
  if (groupStage) {
    const groupMatches = matches.filter(m => m.stage_id === groupStage.id);
    const allGroupMatchesFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finalizado');

    if (allGroupMatchesFinished) {
      // 1.1: Liga -> Top 4 (Semis)
      if (rules.format === 'league_top_4' || rules.format === 'league') {
        const { data: standings } = await supabase.from('standings').select('team_id, points, goal_diff, goals_for').eq('season_id', seasonId);
        
        if (standings && standings.length >= 4) {
          const sorted = [...standings].sort((a, b) => 
            b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for
          );

          let targetSemi = semiStage;
          if (!targetSemi) {
            const { data: newSemi } = await supabase.from('stages').insert([{ season_id: seasonId, name: 'Semifinal', type: 'semi', order_index: 10 }]).select().single();
            targetSemi = newSemi;
          }
          
          if (targetSemi) {
            const existing = matches.filter(m => m.stage_id === targetSemi?.id);
            if (existing.length === 0) {
              const semis = [
                { season_id: seasonId, stage_id: targetSemi.id, home_team_id: sorted[0].team_id, away_team_id: sorted[3].team_id, round: 100, status: 'agendado', phase: 'semifinal' },
                { season_id: seasonId, stage_id: targetSemi.id, home_team_id: sorted[1].team_id, away_team_id: sorted[2].team_id, round: 100, status: 'agendado', phase: 'semifinal' }
              ];
              await supabase.from('matches').insert(semis);
              generatedSomething = true;
            }
          }
        }
      } 
      // 1.2: 2 Grupos -> Semis (1A x 2B, 1B x 2A)
      else if (rules.format === 'groups_2_top_2') {
        const { data: standings } = await supabase.from('standings').select('team_id, team:teams!inner(id, name), season_team:season_teams!inner(group_name), points, goal_diff, goals_for').eq('season_id', seasonId);
        
        if (standings) {
          const groupA = standings.filter((s: any) => s.season_team.group_name === 'A').sort((a: any, b: any) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);
          const groupB = standings.filter((s: any) => s.season_team.group_name === 'B').sort((a: any, b: any) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for);

          if (groupA.length >= 2 && groupB.length >= 2) {
             let targetSemi = semiStage;
             if (!targetSemi) {
               const { data: newSemi } = await supabase.from('stages').insert([{ season_id: seasonId, name: 'Semifinal', type: 'semi', order_index: 10 }]).select().single();
               targetSemi = newSemi;
             }
             if (targetSemi && matches.filter(m => m.stage_id === targetSemi?.id).length === 0) {
               const semis = [
                 { season_id: seasonId, stage_id: targetSemi.id, home_team_id: groupA[0].team_id, away_team_id: groupB[1].team_id, round: 100, status: 'agendado', phase: 'semifinal' },
                 { season_id: seasonId, stage_id: targetSemi.id, home_team_id: groupB[0].team_id, away_team_id: groupA[1].team_id, round: 100, status: 'agendado', phase: 'semifinal' }
               ];
               await supabase.from('matches').insert(semis);
               generatedSomething = true;
             }
          }
        }
      }
    }
  }

  // ── REGLA 2: PROPAGAÇÃO MATA-MATA (Quartas -> Semis -> Finais) ──
  const { data: currentMatches } = await supabase.from('matches').select('*').eq('season_id', seasonId).order('id');
  const allM = currentMatches || matches;

  // Função auxiliar para propagar ganhadores
  const propagateWinner = async (sourceMatches: Match[], targetStage: Stage, mappings: { sourceIndex: number, position: 'home' | 'away' }[]) => {
    const existing = allM.filter(m => m.stage_id === targetStage.id);
    if (existing.length === 0) return false;

    let changed = false;
    for (const map of mappings) {
      const source = sourceMatches[map.sourceIndex];
      if (source?.status === 'finalizado' && source.winner_id) {
        const targetGameIndex = Math.floor(map.sourceIndex / 2);
        const targetMatch = existing[targetGameIndex];
        
        if (targetMatch) {
          const updateData: any = {};
          if (map.position === 'home' && targetMatch.home_team_id !== source.winner_id) {
            updateData.home_team_id = source.winner_id;
          } else if (map.position === 'away' && targetMatch.away_team_id !== source.winner_id) {
            updateData.away_team_id = source.winner_id;
          }

          if (Object.keys(updateData).length > 0) {
            await supabase.from('matches').update(updateData).eq('id', targetMatch.id);
            changed = true;
          }
        }
      }
    }
    return changed;
  };

  // 2.1: Oitavas -> Quartas
  if (oitavasStage && quartasStage) {
    const oMatches = allM.filter(m => m.stage_id === oitavasStage.id);
    if (oMatches.length >= 8) {
      const res = await propagateWinner(oMatches, quartasStage, [
        { sourceIndex: 0, position: 'home' },
        { sourceIndex: 1, position: 'away' },
        { sourceIndex: 2, position: 'home' },
        { sourceIndex: 3, position: 'away' },
        { sourceIndex: 4, position: 'home' },
        { sourceIndex: 5, position: 'away' },
        { sourceIndex: 6, position: 'home' },
        { sourceIndex: 7, position: 'away' }
      ]);
      if (res) generatedSomething = true;
    }
  }

  // 2.2: Quartas -> Semis
  if (quartasStage && semiStage) {
    const qMatches = allM.filter(m => m.stage_id === quartasStage.id);
    if (qMatches.length >= 4) {
      const res = await propagateWinner(qMatches, semiStage, [
        { sourceIndex: 0, position: 'home' },
        { sourceIndex: 1, position: 'away' },
        { sourceIndex: 2, position: 'home' },
        { sourceIndex: 3, position: 'away' }
      ]);
      if (res) generatedSomething = true;
    }
  }

  // 2.3: Semis -> Final & 3º Lugar
  if (semiStage && (finalStage || stages.find(s => s.type === 'third_place'))) {
    const sMatches = allM.filter(m => m.stage_id === semiStage.id);
    if (sMatches.length === 2 && sMatches.every(m => m.status === 'finalizado' && m.winner_id)) {
      const w1 = sMatches[0].winner_id!;
      const w2 = sMatches[1].winner_id!;
      const l1 = sMatches[0].home_team_id === w1 ? sMatches[0].away_team_id : sMatches[0].home_team_id;
      const l2 = sMatches[1].home_team_id === w2 ? sMatches[1].away_team_id : sMatches[1].home_team_id;

      const thirdS = stages.find(s => s.type === 'third_place');
      
      if (finalStage) {
        const fMatch = allM.find(m => m.stage_id === finalStage.id);
        if (fMatch) {
          if (fMatch.home_team_id !== w1 || fMatch.away_team_id !== w2) {
            await supabase.from('matches').update({ home_team_id: w1, away_team_id: w2 }).eq('id', fMatch.id);
            generatedSomething = true;
          }
        } else {
          await supabase.from('matches').insert([{ season_id: seasonId, stage_id: finalStage.id, home_team_id: w1, away_team_id: w2, status: 'agendado', phase: 'final' }]);
          generatedSomething = true;
        }
      }

      if (thirdS) {
        const tMatch = allM.find(m => m.stage_id === thirdS.id);
        if (tMatch) {
          if (tMatch.home_team_id !== l1 || tMatch.away_team_id !== l2) {
            await supabase.from('matches').update({ home_team_id: l1, away_team_id: l2 }).eq('id', tMatch.id);
            generatedSomething = true;
          }
        } else {
          await supabase.from('matches').insert([{ season_id: seasonId, stage_id: thirdS.id, home_team_id: l1, away_team_id: l2, status: 'agendado', phase: 'terceiro_lugar' }]);
          generatedSomething = true;
        }
      }
    }
  }

  return { success: true, generated: generatedSomething };
};
