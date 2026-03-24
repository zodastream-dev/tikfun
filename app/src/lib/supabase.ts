import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
// service_role key - 绕过 RLS，仅内部使用
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvZG9nc3hua2t0eGRybW5pY2hiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMxNzk5NiwiZXhwIjoyMDg5ODkzOTk2fQ.XLlbVtChuMaK-53Cjy7fuUhnE0a5Oyr6SD2V_sREYxs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
