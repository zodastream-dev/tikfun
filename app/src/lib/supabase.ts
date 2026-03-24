import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Database types ───────────────────────────────────────────────────────────

export interface DbProduct {
  id: string
  user_id: string
  name: string
  description: string | null
  source_type: 'file' | 'text'
  file_name: string | null
  file_size: number | null
  file_path: string | null       // Storage path
  video_status: 'pending' | 'processing' | 'completed' | 'error'
  video_progress: number
  video_url: string | null
  video_style: string
  video_ratio: string
  video_duration: number
  bg_music: boolean
  voiceover: boolean
  subtitles: boolean
  error_msg: string | null
  created_at: string
  updated_at: string
}
