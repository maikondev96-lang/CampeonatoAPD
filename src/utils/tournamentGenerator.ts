/**
 * Tournament Match Generator
 * Handles automatic generation of round-robin and knockout schedules.
 */

interface Team {
  id: string;
  name: string;
}

export const generateRoundRobin = (teams: Team[], doubleRound: boolean = false) => {
  if (teams.length < 2) return [];
  
  const schedule: any[] = [];
  const tempTeams = [...teams];
  if (tempTeams.length % 2 !== 0) {
    tempTeams.push({ id: 'bye', name: 'BYE' });
  }

  const numTeams = tempTeams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  for (let round = 0; round < numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = tempTeams[match];
      const away = tempTeams[numTeams - 1 - match];

      if (home.id !== 'bye' && away.id !== 'bye') {
        schedule.push({
          round: round + 1,
          home_team_id: home.id,
          away_team_id: away.id
        });
      }
    }
    // Rotate teams (keeping the first one fixed)
    tempTeams.splice(1, 0, tempTeams.pop()!);
  }

  if (doubleRound) {
    const secondLeg = schedule.map(m => ({
      round: m.round + numRounds,
      home_team_id: m.away_team_id,
      away_team_id: m.home_team_id
    }));
    return [...schedule, ...secondLeg];
  }

  return schedule;
};

export const generateKnockoutSlots = (seasonId: string, stageId: string, phase: string, count: number) => {
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push({
      season_id: seasonId,
      stage_id: stageId,
      round: 1,
      phase: phase,
      status: 'agendado',
      home_team_id: null, // To be filled by standings
      away_team_id: null  // To be filled by standings
    });
  }
  return slots;
};
