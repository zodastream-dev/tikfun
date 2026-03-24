import { useEffect, useRef } from 'react'
import { X, Download, ExternalLink } from 'lucide-react'
import type { ProductItem } from '../types'
import { getStyleLabel } from '../utils'

interface VideoPreviewModalProps {
  item: ProductItem | null
  onClose: () => void
}

export function VideoPreviewModal({ item, onClose }: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (item) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [item])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="font-semibold text-white text-lg">{item.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {getStyleLabel(item.config.style)} · {item.config.ratio} · {item.config.duration}秒
              {item.config.bgMusic && ' · 背景音乐'}
              {item.config.voiceover && ' · AI配音'}
              {item.config.subtitles && ' · 字幕'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black" style={{ aspectRatio: item.config.ratio === '9:16' ? '9/16' : item.config.ratio === '1:1' ? '1/1' : '16/9', maxHeight: '60vh' }}>
          {item.videoUrl ? (
            <video
              ref={videoRef}
              src={item.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              style={{ maxHeight: '60vh' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500 py-16">
              <div className="text-5xl">🎬</div>
              <p>视频暂未就绪</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            生成完成于 {item.updatedAt.toLocaleString('zh-CN')}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => item.videoUrl && window.open(item.videoUrl, '_blank')}
              disabled={!item.videoUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm text-slate-300 transition-all"
            >
              <ExternalLink size={14} /> 新窗口打开
            </button>
            <a
              href={item.videoUrl || '#'}
              download={`${item.name}.mp4`}
              className={`flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-medium transition-all ${!item.videoUrl ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <Download size={14} /> 下载视频
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
