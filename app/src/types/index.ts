export type VideoStatus = 'pending' | 'processing' | 'completed' | 'error'

export type VideoStyle = 'modern' | 'elegant' | 'energetic' | 'minimal' | 'luxury'

export type VideoRatio = '16:9' | '9:16' | '1:1'

export interface VideoConfig {
  style: VideoStyle
  ratio: VideoRatio
  duration: number // seconds
  bgMusic: boolean
  voiceover: boolean
  subtitles: boolean
}

export interface ProductItem {
  id: string
  name: string
  description: string
  sourceType: 'file' | 'text'
  fileName?: string
  fileSize?: number
  fileType?: string
  status: VideoStatus
  progress: number
  videoUrl?: string
  thumbnailUrl?: string
  config: VideoConfig
  createdAt: Date
  updatedAt: Date
  errorMsg?: string
}

export type TabId = 'upload' | 'tasks' | 'gallery'
