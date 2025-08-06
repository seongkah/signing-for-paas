import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          last_login: string | null
          is_active: boolean
          tier: 'free' | 'api_key'
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          last_login?: string | null
          is_active?: boolean
          tier?: 'free' | 'api_key'
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          last_login?: string | null
          is_active?: boolean
          tier?: 'free' | 'api_key'
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          key_hash: string
          name: string
          created_at: string
          last_used: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          key_hash: string
          name: string
          created_at?: string
          last_used?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          key_hash?: string
          name?: string
          created_at?: string
          last_used?: string | null
          is_active?: boolean
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string | null
          api_key_id: string | null
          room_url: string
          success: boolean
          response_time_ms: number
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          api_key_id?: string | null
          room_url: string
          success: boolean
          response_time_ms: number
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          api_key_id?: string | null
          room_url?: string
          success?: boolean
          response_time_ms?: number
          error_message?: string | null
          created_at?: string
        }
      }
      quota_usage: {
        Row: {
          id: string
          user_id: string
          date: string
          request_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          request_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          request_count?: number
          created_at?: string
        }
      }
    }
  }
}