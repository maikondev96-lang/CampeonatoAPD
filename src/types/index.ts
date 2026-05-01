// ============================================================
// TYPES — Plataforma Copa APD v3.0
// ============================================================

// ─── Organização (Portal Institucional) ────────────────────────
export type Organization = {
  id: string;
  name: string;
  short_name?: string;
  slug: string;
  logo_url?: string;
  description?: string;
  primary_color?: string;
  secondary_color?: string;
  website?: string;
  active: boolean;
  created_at?: string;
}

// ─── Competição ──────────────────────────────────────────────
export type CompetitionType = 'league' | 'knockout' | 'groups_knockout' | 'hybrid' | 'league_knockout';

export type Competition = {
  id: string;
  organization_id?: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  type: CompetitionType;
  description?: string;
  rules_json?: Record<string, unknown>;
  registration_fields?: {
    required: string[];
    optional: string[];
  };
  is_active: boolean;
  created_at?: string;
  // Relações
  organization?: Organization;
  seasons?: Season[];
}

// ─── Temporada ───────────────────────────────────────────────
export type SeasonStatus = 'draft' | 'active' | 'finished';

export type Season = {
  id: string;
  competition_id: string;
  year: number;
  status: SeasonStatus;
  inherited_from_season_id?: string;
  allow_registrations?: boolean;
  champion_team_id?: string;
  runner_up_team_id?: string;
  created_at?: string;
  // Relações
  competition?: Competition;
  champion_team?: Team;
  runner_up_team?: Team;
  stages?: Stage[];
  season_teams?: SeasonTeam[];
  registration_links?: RegistrationLink[];
}

// ─── Inscrição de Time na Temporada ──────────────────────────
export type SeasonTeam = {
  id: string;
  season_id: string;
  team_id: string;
  group_name?: string;
  seed?: number;
  created_at?: string;
  // Relações
  team?: Team;
  season?: Season;
}

// ─── Fase (dinâmica) ─────────────────────────────────────────
export type StageType = 'group' | 'round_of_16' | 'quarter' | 'semi' | 'third_place' | 'final' | 'league_round';

export type Stage = {
  id: string;
  season_id: string;
  name: string;
  type: StageType;
  order_index: number;
  created_at?: string;
  // Relações
  season?: Season;
  matches?: Match[];
}

// ─── Time ────────────────────────────────────────────────────
export type Team = {
  id: string;
  name: string;
  short_name?: string;
  logo_url: string;
  active: boolean;
  created_at?: string;
  // Campos legados (roster management)
  invite_token?: string;
  invite_expires_at?: string;
  roster_status?: 'pendente' | 'enviado' | 'finalizado' | 'aprovado';
  // Relações
  players?: Player[];
}

// ─── Jogador ─────────────────────────────────────────────────
export type PlayerPosition = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'ATA';

export type Player = {
  id: string;
  name: string;
  team_id: string;
  shirt_number?: number;
  photo_url?: string;
  position?: PlayerPosition;
  active: boolean;
  updated_at?: string;
  // Relações
  team?: Team;
}

// ─── Partida ─────────────────────────────────────────────────
export type MatchStatus = 'agendado' | 'ao_vivo' | 'finalizado' | 'adiado';

export type Match = {
  id: string;
  season_id: string;
  stage_id?: string;
  round: number;
  home_team_id: string;
  away_team_id: string;
  date: string;
  time?: string;
  venue?: string;
  status: MatchStatus;
  home_score?: number;
  away_score?: number;
  home_penalties?: number;
  away_penalties?: number;
  winner_id?: string;
  created_at?: string;
  // Campo legado (será removido após migração completa do frontend)
  phase?: string;
  // Relações
  home_team?: Team;
  away_team?: Team;
  stage?: Stage;
  season?: Season;
  events?: MatchEvent[];
}

// ─── Evento de Partida ───────────────────────────────────────
export type MatchEventType =
  | 'gol'
  | 'gol_penalti'
  | 'penalti_perdido_tempo_normal'
  | 'cartao_amarelo'
  | 'cartao_vermelho_direto'
  | 'cartao_vermelho_indireto'
  | 'penalti_convertido'
  | 'penalti_perdido';

export type MatchEvent = {
  id: string;
  match_id: string;
  player_id: string;
  team_id?: string;
  type: MatchEventType;
  minute?: number;
  assist_player_id?: string;
  created_at?: string;
  // Relações
  player?: Player;
  assist_player?: Player;
}

// ─── Classificação ───────────────────────────────────────────
export type Standing = {
  team_id: string;
  season_id?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  // Relações
  team?: Team;
}

// ─── Estatísticas do Jogador por Temporada ───────────────────
export type PlayerStatsBySeason = {
  id: string;
  season_id: string;
  player_id: string;
  team_id: string;
  goals: number;
  assists: number;
  yellow_cards?: number;
  red_cards?: number;
  matches_played: number;
  // Relações
  player?: Player;
  team?: Team;
  season?: Season;
}

// ─── Registration & Approvals (Phase 1) ───────────────────────

export type TeamManager = {
  id: string;
  auth_user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  created_at?: string;
}

export type RegistrationLink = {
  id: string;
  season_id: string;
  token: string;
  expires_at?: string;
  active: boolean;
  created_at?: string;
  // Relations
  season?: Season;
}

export type RegistrationSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'correction_requested';

export type RegistrationSubmission = {
  id: string;
  registration_link_id: string;
  team_name: string;
  team_short_name?: string;
  team_city?: string;
  team_logo_url?: string;
  manager_name: string;
  manager_email?: string;
  manager_phone?: string;
  players_data?: any[];
  status: RegistrationSubmissionStatus;
  admin_feedback?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  registration_link?: RegistrationLink;
}

export type PlayerRegistrationStatus = 'pending' | 'approved' | 'rejected';

export type PlayerRegistration = {
  id: string;
  team_id: string;
  season_id: string;
  name: string;
  shirt_number: number;
  position: string;
  photo_url?: string;
  status: PlayerRegistrationStatus;
  feedback?: string;
  created_at?: string;
  updated_at?: string;
  // Relations
  team?: Team;
}

export type ApprovalLog = {
  id: string;
  submission_id: string;
  admin_id?: string;
  action: string;
  notes?: string;
  created_at?: string;
}

// ─── Helpers para UI ─────────────────────────────────────────

/** Mapa de labels para StageType */
export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  group: 'Fase de Grupos',
  round_of_16: 'Oitavas de Final',
  quarter: 'Quartas de Final',
  semi: 'Semifinal',
  third_place: 'Disputa de 3º Lugar',
  final: 'Final',
  league_round: 'Rodada',
};

/** Mapa de labels para MatchStatus */
export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  agendado: 'Agendado',
  ao_vivo: 'Ao Vivo',
  finalizado: 'Encerrado',
  adiado: 'Adiado',
};

/** Mapa de labels para MatchEventType */
export const EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  gol: '⚽ Gol',
  gol_penalti: '⚽ Gol de Pênalti',
  penalti_perdido_tempo_normal: '❌ Pênalti Perdido',
  cartao_amarelo: '🟨 Cartão Amarelo',
  cartao_vermelho_direto: '🟥 Vermelho Direto',
  cartao_vermelho_indireto: '🟥 2º Amarelo',
  penalti_convertido: '✅ Pênalti Convertido',
  penalti_perdido: '❌ Pênalti Perdido (Disputa)',
};

/** Mapa de labels para CompetitionType */
export const COMPETITION_TYPE_LABELS: Record<CompetitionType, string> = {
  league: 'Liga (Pontos Corridos)',
  knockout: 'Mata-Mata',
  groups_knockout: 'Grupos + Mata-Mata',
  hybrid: 'Híbrido',
  league_knockout: 'Pontos Corridos + Mata-Mata',
};
