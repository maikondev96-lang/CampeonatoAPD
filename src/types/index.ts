export type Team = {
  id: string;
  name: string;
  logo_url: string;
}

export type Player = {
  id: string;
  name: string;
  team_id: string;
}

export type Match = {
  id: string;
  round: number;
  home_team_id: string;
  away_team_id: string;
  date: string;
  time?: string;
  venue?: string;
  phase: 'grupo' | 'semifinal' | 'terceiro_lugar' | 'final';
  status: 'agendado' | 'finalizado';
  home_score?: number;
  away_score?: number;
  home_penalties?: number;
  away_penalties?: number;
  winner_id?: string;
  home_team?: Team;
  away_team?: Team;
}

export type MatchEvent = {
  id: string;
  match_id: string;
  player_id: string;
  type: 'gol' | 'assistencia' | 'cartao_amarelo' | 'cartao_vermelho';
  minute?: number;
  assist_player_id?: string;
  player?: Player;
  assist_player?: Player;
}

export type Standing = {
  team_id: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  team?: Team;
}

