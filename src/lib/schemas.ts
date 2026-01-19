import { z } from 'zod'

export const participantSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  created_at: z.string().optional(),
})

export const roundSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().max(100, 'Round name must be less than 100 characters').optional(),
  round_number: z.number().int().min(1, 'Round number must be at least 1'),
  created_at: z.string().optional(),
})

export const scoreSchema = z.object({
  id: z.string().uuid().optional(),
  participant_id: z.string().uuid('Invalid participant ID'),
  round_id: z.string().uuid('Invalid round ID'),
  points: z.number().int('Points must be a whole number'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Participant = z.infer<typeof participantSchema>
export type Round = z.infer<typeof roundSchema>
export type Score = z.infer<typeof scoreSchema>

export type LeaderboardEntry = {
  id: string
  name: string
  total_points: number
  latest_round_points: number | null
  scores: Array<{
    round_id: string
    round_name: string
    round_number: number
    points: number
  }>
}