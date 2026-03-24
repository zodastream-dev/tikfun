import { useState } from 'react'
import { Clock, CheckCircle2, AlertCircle, Loader2, Play, Trash2, Download, Eye } from 'lucide-react'
import type { ProductItem, VideoStatus } from '../types'
import { getStatusLabel, getStyleLabel } from '../utils'

interface TasksPageProps {
  items: ProductItem[]
  onRetry: (id: string) => void
  onRemove: (id: string) => void
  onPreview: (item: ProductItem) => void
}

type FilterStatus = 'all' | VideoStatus

export function TasksPage({ items, onRetry, onRemove, onPreview }: TasksPageProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)

  const counts = {
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    processing: items.filter(i => i.status === 'processing').length,
    completed: items.filter(i => i.status === 'completed').length,
    error: items.filter(i => i.status === 'error').length,
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">生成任务</h1>
          <p className="text-slate-400">追踪所有视频生成任务的状态和进度</p>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Clock size={28} className="text-slate-500" />
          </div>
          <p className="text-lg text-slate-400 mb-2">暂无生成任务</p>
          <p className="text-sm text-slate-500">上传产品介绍并开始生成后，任务会显示在这里</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">生成任务</h1>
        <p className="text-slate-400">共 {items.length} 个任务</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { key: 'pending', label: '等待中', icon: Clock, color: '#94a3b8' },
          { key: 'processing', label: '生成中', icon: Loader2, color: '#f59e0b' },
          { key: 'completed', label: '已完成', icon: CheckCircle2, color: '#10b981' },
          { key: 'error', label: '失败', icon: AlertCircle, color: '#ef4444' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <Icon size={20} className="mx-auto mb-2" style={{ color: stat.color }} />
              <div className="text-2xl font-bold text-white">{counts[stat.key as FilterStatus]}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'pending', 'processing', 'completed', 'error'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {f === 'all' ? `全部 (${counts.all})` : `${getStatusLabel(f)} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.map(item => (
          <TaskCard
            key={item.id}
            item={item}
            onRetry={() => onRetry(item.id)}
            onRemove={() => onRemove(item.id)}
            onPreview={() => onPreview(item)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          该状态下暂无任务
        </div>
      )}
    </div>
  )
}

function TaskCard({ item, onRetry, onRemove, onPreview }: {
  item: ProductItem
  onRetry: () => void
  onRemove: () => void
  onPreview: () => void
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 hover:border-slate-600 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Thumbnail / Icon */}
        <div className="w-16 h-16 rounded-xl bg-slate-700 flex-shrink-0 overflow-hidden flex items-center justify-center relative">
          {item.status === 'completed' && item.videoUrl ? (
            <video
              src={item.videoUrl}
              className="w-full h-full object-cover"
              muted
            />
          ) : item.status === 'processing' ? (
            <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin-slow" />
            </div>
          ) : (
            <div className="text-2xl">
              {item.status === 'completed' ? '🎬' : item.status === 'error' ? '❌' : '📄'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-white truncate">{item.name}</h3>
            <StatusBadge status={item.status} />
          </div>

          {/* Meta */}
          <p className="text-xs text-slate-500 mb-2">
            {getStyleLabel(item.config.style)} · {item.config.ratio} · {item.config.duration}s
            {item.sourceType === 'file' && item.fileName && ` · ${item.fileName}`}
          </p>

          {/* Progress bar */}
          {(item.status === 'processing' || item.status === 'pending') && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{item.status === 'processing' ? getProgressText(item.progress) : '等待开始'}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.progress}%`,
                    background: item.status === 'processing'
                      ? 'linear-gradient(90deg, #6366f1, #818cf8)'
                      : '#475569'
                  }}
                />
              </div>
            </div>
          )}

          {item.status === 'error' && item.errorMsg && (
            <p className="text-xs text-red-400 mb-2">{item.errorMsg}</p>
          )}

          {/* Time */}
          <p className="text-xs text-slate-600">
            创建于 {formatTime(item.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {item.status === 'completed' && (
            <>
              <ActionButton onClick={onPreview} title="预览" color="indigo">
                <Eye size={14} />
              </ActionButton>
              <ActionButton onClick={() => {}} title="下载" color="emerald">
                <Download size={14} />
              </ActionButton>
            </>
          )}
          {item.status === 'error' && (
            <ActionButton onClick={onRetry} title="重试" color="amber">
              <Play size={14} />
            </ActionButton>
          )}
          <ActionButton onClick={onRemove} title="删除" color="red">
            <Trash2 size={14} />
          </ActionButton>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: VideoStatus }) {
  const configs = {
    pending: { color: 'bg-slate-700 text-slate-300', icon: '○' },
    processing: { color: 'bg-amber-500/20 text-amber-300', icon: '◑' },
    completed: { color: 'bg-emerald-500/20 text-emerald-300', icon: '✓' },
    error: { color: 'bg-red-500/20 text-red-300', icon: '✗' },
  }
  const cfg = configs[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      <span>{cfg.icon}</span>
      {getStatusLabel(status)}
    </span>
  )
}

function ActionButton({ onClick, title, color, children }: {
  onClick: () => void
  title: string
  color: string
  children: React.ReactNode
}) {
  const colors = {
    indigo: 'hover:bg-indigo-500/20 hover:text-indigo-300',
    emerald: 'hover:bg-emerald-500/20 hover:text-emerald-300',
    amber: 'hover:bg-amber-500/20 hover:text-amber-300',
    red: 'hover:bg-red-500/20 hover:text-red-400',
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg text-slate-400 transition-all duration-150 ${colors[color as keyof typeof colors] || colors.indigo}`}
    >
      {children}
    </button>
  )
}

function getProgressText(progress: number): string {
  if (progress < 20) return '解析产品信息...'
  if (progress < 40) return '生成视频脚本...'
  if (progress < 60) return '合成视频画面...'
  if (progress < 80) return '添加音频配音...'
  if (progress < 95) return '渲染导出视频...'
  return '即将完成...'
}

function formatTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
