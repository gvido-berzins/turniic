import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      participants: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          name: string
          round_number: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          round_number: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          round_number?: number
          created_at?: string
        }
      }
      scores: {
        Row: {
          id: string
          participant_id: string
          round_id: string
          points: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          round_id: string
          points: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          round_id?: string
          points?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}