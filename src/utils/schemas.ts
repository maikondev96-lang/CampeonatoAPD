import { z } from 'zod';

export const playerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  shirt_number: z.coerce.number().int().min(1, 'O número deve ser pelo menos 1').max(999, 'Número inválido'),
  team_id: z.string().uuid('ID do time inválido'),
  photo_url: z.string().url('URL da foto inválida').or(z.literal('')).optional(),
  position: z.string().optional(),
});

export type PlayerSchema = z.infer<typeof playerSchema>;

export const registrationSubmissionSchema = z.object({
  team_name: z.string().min(2, 'Nome do time deve ter pelo menos 2 caracteres'),
  manager_name: z.string().min(2, 'Nome do gestor deve ter pelo menos 2 caracteres'),
  players_data: z.array(z.object({
    name: z.string().min(2, 'Nome do atleta inválido'),
    number: z.coerce.number().min(1).max(999),
    position: z.string().optional(),
    photo: z.string().url().or(z.literal('')).optional(),
  })).min(1, 'Adicione pelo menos um jogador'),
});
