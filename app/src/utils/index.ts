import type { ProductItem, VideoConfig, VideoStatus } from '../types'

const VIDEO_STYLE_LABELS: Record<string, string> = {
  modern: '现代科技',
  elegant: '优雅时尚',
  energetic: '活力动感',
  minimal: '简约清新',
  luxury: '奢华高端',
}

export function getStyleLabel(style: string): string {
  return VIDEO_STYLE_LABELS[style] || style
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getDefaultConfig(): VideoConfig {
  return {
    style: 'modern',
    ratio: '16:9',
    duration: 30,
    bgMusic: true,
    voiceover: true,
    subtitles: true,
  }
}

export function createProductItem(partial: Partial<ProductItem>): ProductItem {
  const now = new Date()
  return {
    id: generateId(),
    name: '未命名产品',
    description: '',
    sourceType: 'text',
    status: 'pending',
    progress: 0,
    config: getDefaultConfig(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

// Simulate video generation progress
export function simulateProgress(
  item: ProductItem,
  onUpdate: (id: string, status: VideoStatus, progress: number, videoUrl?: string) => void
): void {
  const stages = [
    { progress: 10, delay: 500 },
    { progress: 25, delay: 800 },
    { progress: 40, delay: 1000 },
    { progress: 60, delay: 1200 },
    { progress: 75, delay: 800 },
    { progress: 90, delay: 600 },
    { progress: 100, delay: 400 },
  ]

  let i = 0
  let total = 0

  function next() {
    if (i >= stages.length) {
      // Done - use a placeholder video URL
      const videoUrls = [
        'https://www.w3schools.com/html/mov_bbb.mp4',
        'https://www.w3schools.com/html/movie.mp4',
      ]
      const url = videoUrls[Math.floor(Math.random() * videoUrls.length)]
      onUpdate(item.id, 'completed', 100, url)
      return
    }
    const stage = stages[i]
    total += stage.delay
    i++
    setTimeout(() => {
      onUpdate(item.id, 'processing', stage.progress)
      next()
    }, stage.delay)
  }

  onUpdate(item.id, 'processing', 5)
  next()
}

export function getStatusLabel(status: VideoStatus): string {
  const labels: Record<VideoStatus, string> = {
    pending: '等待中',
    processing: '生成中',
    completed: '已完成',
    error: '生成失败',
  }
  return labels[status]
}

export function getStatusColor(status: VideoStatus): string {
  const colors: Record<VideoStatus, string> = {
    pending: '#94a3b8',
    processing: '#f59e0b',
    completed: '#10b981',
    error: '#ef4444',
  }
  return colors[status]
}
