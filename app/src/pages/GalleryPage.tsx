import { useState } from 'react'
import { Download, Eye, Search, Grid3X3, List, Trash2 } from 'lucide-react'
import type { ProductItem } from '../types'
import { getStyleLabel } from '../utils'

interface GalleryPageProps {
  items: ProductItem[]
  onPreview: (item: ProductItem) => void
  onRemove: (id: string) => void
}

export function GalleryPage({ items, onPreview, onRemove }: GalleryPageProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')

  const completedItems = items.filter(i => i.status === 'completed')
  const filtered = completedItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  if (completedItems.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">视频库</h1>
          <p className="text-slate-400">已完成生成的产品视频</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-3xl">
            🎬
          </div>
          <p className="text-lg text-slate-400 mb-2">视频库为空</p>
          <p className="text-sm text-slate-500">视频生成完成后将显示在这里，可预览和下载</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">视频库</h1>
          <p className="text-slate-400">{completedItems.length} 个视频已生成</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索视频名称..."
          className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">未找到匹配的视频</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map(item => (
            <VideoCard key={item.id} item={item} onPreview={() => onPreview(item)} onRemove={() => onRemove(item.id)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <VideoListItem key={item.id} item={item} onPreview={() => onPreview(item)} onRemove={() => onRemove(item.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function VideoCard({ item, onPreview, onRemove }: {
  item: ProductItem
  onPreview: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-200 hover:scale-[1.02]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Video thumbnail */}
      <div className="relative aspect-video bg-slate-900">
        {item.videoUrl ? (
          <video
            src={item.videoUrl}
            className="w-full h-full object-cover"
            autoPlay={hovered}
            muted
            loop
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
        )}
        {/* Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={onPreview}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Eye size={16} className="text-white" />
          </button>
          <button
            onClick={() => {}}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <Download size={16} className="text-white" />
          </button>
        </div>
        {/* Ratio badge */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/50 backdrop-blur rounded text-xs text-white">
          {item.config.ratio}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-white text-sm truncate mb-1">{item.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{getStyleLabel(item.config.style)} · {item.config.duration}s</p>
          <button
            onClick={onRemove}
            className="p-1 text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

function VideoListItem({ item, onPreview, onRemove }: {
  item: ProductItem
  onPreview: () => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-3 hover:border-slate-600 transition-all">
      {/* Thumbnail */}
      <div className="w-24 h-14 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden">
        {item.videoUrl ? (
          <video src={item.videoUrl} className="w-full h-full object-cover" muted />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate">{item.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {getStyleLabel(item.config.style)} · {item.config.ratio} · {item.config.duration}s
          {item.config.bgMusic && ' · 背景音乐'}
          {item.config.voiceover && ' · AI配音'}
          {item.config.subtitles && ' · 字幕'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 text-right whitespace-nowrap">
          {formatTime(item.updatedAt)}
        </span>
        <button
          onClick={onPreview}
          className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
          title="预览"
        >
          <Eye size={14} />
        </button>
        <button
          onClick={() => {}}
          className="p-2 text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all"
          title="下载"
        >
          <Download size={14} />
        </button>
        <button
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          title="删除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
