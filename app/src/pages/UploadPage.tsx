import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileText, Plus, Settings2, Play, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { ProductItem, VideoConfig, VideoStyle, VideoRatio } from '../types'
import { createProductItem, getDefaultConfig, formatFileSize, getStyleLabel } from '../utils'

interface UploadPageProps {
  onAddProducts: (items: ProductItem[]) => void
  onStartGeneration: (ids: string[]) => void
}

const STYLE_OPTIONS: { value: VideoStyle; label: string; desc: string; color: string }[] = [
  { value: 'modern', label: '现代科技', desc: '科技感强，适合数码产品', color: '#6366f1' },
  { value: 'elegant', label: '优雅时尚', desc: '精致优雅，适合服装美妆', color: '#ec4899' },
  { value: 'energetic', label: '活力动感', desc: '充满活力，适合运动食品', color: '#f59e0b' },
  { value: 'minimal', label: '简约清新', desc: '干净简洁，适合家居用品', color: '#10b981' },
  { value: 'luxury', label: '奢华高端', desc: '高端质感，适合奢侈品', color: '#8b5cf6' },
]

const RATIO_OPTIONS: { value: VideoRatio; label: string; icon: string }[] = [
  { value: '16:9', label: '横版 16:9', icon: '▬' },
  { value: '9:16', label: '竖版 9:16', icon: '▮' },
  { value: '1:1', label: '方形 1:1', icon: '■' },
]

interface TextProductForm {
  name: string
  description: string
}

export function UploadPage({ onAddProducts, onStartGeneration }: UploadPageProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file')
  const [dragOver, setDragOver] = useState(false)
  const [pendingItems, setPendingItems] = useState<ProductItem[]>([])
  const [globalConfig, setGlobalConfig] = useState<VideoConfig>(getDefaultConfig())
  const [showConfig, setShowConfig] = useState(false)
  const [textForm, setTextForm] = useState<TextProductForm>({ name: '', description: '' })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f =>
      f.type === 'application/pdf' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      f.type === 'application/msword' ||
      f.name.endsWith('.pdf') ||
      f.name.endsWith('.docx') ||
      f.name.endsWith('.doc')
    )

    if (validFiles.length === 0) return

    const items = validFiles.map(file => createProductItem({
      name: file.name.replace(/\.(pdf|docx|doc)$/i, ''),
      sourceType: 'file',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      config: { ...globalConfig },
    }))

    setPendingItems(prev => [...prev, ...items])
  }, [globalConfig])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleAddText = () => {
    if (!textForm.name.trim() && !textForm.description.trim()) return
    const item = createProductItem({
      name: textForm.name.trim() || '未命名产品',
      description: textForm.description.trim(),
      sourceType: 'text',
      config: { ...globalConfig },
    })
    setPendingItems(prev => [...prev, item])
    setTextForm({ name: '', description: '' })
  }

  const removeItem = (id: string) => {
    setPendingItems(prev => prev.filter(i => i.id !== id))
  }

  const updateItemConfig = (id: string, config: Partial<VideoConfig>) => {
    setPendingItems(prev => prev.map(item =>
      item.id === id ? { ...item, config: { ...item.config, ...config } } : item
    ))
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const applyConfigToAll = () => {
    setPendingItems(prev => prev.map(item => ({ ...item, config: { ...globalConfig } })))
  }

  const handleStartAll = () => {
    if (pendingItems.length === 0) return
    onAddProducts(pendingItems)
    onStartGeneration(pendingItems.map(i => i.id))
    setPendingItems([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">上传产品介绍</h1>
        <p className="text-slate-400">上传 Word/PDF 文档或直接输入产品描述，AI 自动生成电商视频</p>
      </div>

      {/* Global Config Panel */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl mb-6 overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/30 transition-colors"
          onClick={() => setShowConfig(!showConfig)}
        >
          <div className="flex items-center gap-3">
            <Settings2 size={18} className="text-indigo-400" />
            <span className="font-semibold text-white">全局视频配置</span>
            <span className="text-xs text-slate-400">（将应用到所有产品）</span>
          </div>
          {showConfig ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showConfig && (
          <div className="p-4 pt-0 border-t border-slate-700/50">
            <GlobalConfigPanel
              config={globalConfig}
              onChange={setGlobalConfig}
              onApplyToAll={applyConfigToAll}
              showApplyAll={pendingItems.length > 0}
            />
          </div>
        )}
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 mb-4">
        <TabButton active={activeTab === 'file'} onClick={() => setActiveTab('file')}>
          <Upload size={16} /> 上传文件
        </TabButton>
        <TabButton active={activeTab === 'text'} onClick={() => setActiveTab('text')}>
          <FileText size={16} /> 文本输入
        </TabButton>
      </div>

      {/* Upload Area */}
      {activeTab === 'file' ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
            ${dragOver
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-600 hover:border-indigo-500/50 hover:bg-slate-800/30'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={e => e.target.files && handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200 ${dragOver ? 'bg-indigo-500/30' : 'bg-slate-700'}`}>
              <Upload size={28} className={dragOver ? 'text-indigo-300' : 'text-slate-400'} />
            </div>
            <div>
              <p className="text-lg font-semibold text-white mb-1">
                {dragOver ? '松开鼠标上传文件' : '拖拽文件到这里，或点击选择'}
              </p>
              <p className="text-slate-400 text-sm">支持 PDF、Word (.doc/.docx) 格式，可批量上传</p>
            </div>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="px-2 py-1 bg-slate-700 rounded">PDF</span>
              <span className="px-2 py-1 bg-slate-700 rounded">DOC</span>
              <span className="px-2 py-1 bg-slate-700 rounded">DOCX</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">产品名称</label>
              <input
                type="text"
                value={textForm.name}
                onChange={e => setTextForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="例如：智能运动手环 Pro Max"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">产品介绍</label>
              <textarea
                value={textForm.description}
                onChange={e => setTextForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="请输入详细的产品介绍，包括功能特点、材质工艺、使用场景等，越详细生成效果越好..."
                rows={6}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{textForm.description.length} 字</p>
            </div>
            <button
              onClick={handleAddText}
              disabled={!textForm.name.trim() && !textForm.description.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
            >
              <Plus size={16} /> 添加到队列
            </button>
          </div>
        </div>
      )}

      {/* Pending Items List */}
      {pendingItems.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">待生成列表 <span className="text-indigo-400">({pendingItems.length})</span></h3>
            <button
              onClick={() => setPendingItems([])}
              className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              清空全部
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {pendingItems.map(item => (
              <PendingItemCard
                key={item.id}
                item={item}
                expanded={expandedItems.has(item.id)}
                onToggle={() => toggleExpand(item.id)}
                onRemove={() => removeItem(item.id)}
                onConfigChange={(cfg) => updateItemConfig(item.id, cfg)}
              />
            ))}
          </div>

          <button
            onClick={handleStartAll}
            className="mt-4 w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white font-semibold text-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-indigo-500/25"
          >
            <Play size={20} fill="white" />
            开始生成 {pendingItems.length} 个视频
          </button>
        </div>
      )}
    </div>
  )
}

// Sub-components

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function GlobalConfigPanel({
  config,
  onChange,
  onApplyToAll,
  showApplyAll,
}: {
  config: VideoConfig
  onChange: (c: VideoConfig) => void
  onApplyToAll: () => void
  showApplyAll: boolean
}) {
  return (
    <div className="pt-4 space-y-5">
      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">视频风格</label>
        <div className="grid grid-cols-5 gap-2">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...config, style: opt.value })}
              className={`p-3 rounded-xl border text-center transition-all duration-150 ${
                config.style === opt.value
                  ? 'border-current bg-opacity-10'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
              style={config.style === opt.value ? { borderColor: opt.color, backgroundColor: `${opt.color}15`, color: opt.color } : {}}
            >
              <div className="text-xs font-medium mb-1" style={config.style === opt.value ? { color: opt.color } : { color: '#94a3b8' }}>
                {opt.label}
              </div>
              <div className="text-xs text-slate-500 leading-tight">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Ratio */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">画面比例</label>
          <div className="flex gap-2">
            {RATIO_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...config, ratio: opt.value })}
                className={`flex-1 py-2 px-1 rounded-lg border text-xs font-medium transition-all ${
                  config.ratio === opt.value
                    ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="text-lg mb-0.5">{opt.icon}</div>
                <div className="text-xs leading-tight">{opt.label.split(' ')[1]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">视频时长: {config.duration}秒</label>
          <input
            type="range"
            min={15}
            max={120}
            step={15}
            value={config.duration}
            onChange={e => onChange({ ...config, duration: Number(e.target.value) })}
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>15s</span><span>120s</span>
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">附加选项</label>
          <div className="space-y-2">
            {[
              { key: 'bgMusic', label: '背景音乐' },
              { key: 'voiceover', label: 'AI 配音' },
              { key: 'subtitles', label: '字幕生成' },
            ].map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[opt.key as keyof VideoConfig] as boolean}
                  onChange={e => onChange({ ...config, [opt.key]: e.target.checked })}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
                <span className="text-sm text-slate-300">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {showApplyAll && (
        <button
          onClick={onApplyToAll}
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          将此配置应用到全部待生成产品 →
        </button>
      )}
    </div>
  )
}

function PendingItemCard({
  item,
  expanded,
  onToggle,
  onRemove,
  onConfigChange,
}: {
  item: ProductItem
  expanded: boolean
  onToggle: () => void
  onRemove: () => void
  onConfigChange: (c: Partial<VideoConfig>) => void
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          item.sourceType === 'file' ? 'bg-blue-500/20' : 'bg-green-500/20'
        }`}>
          {item.sourceType === 'file'
            ? <FileText size={14} className="text-blue-400" />
            : <FileText size={14} className="text-green-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{item.name}</p>
          <p className="text-xs text-slate-500">
            {item.sourceType === 'file'
              ? `${item.fileName} · ${formatFileSize(item.fileSize || 0)}`
              : `文本 · ${item.description.slice(0, 30)}${item.description.length > 30 ? '...' : ''}`
            }
            {' · '}{getStyleLabel(item.config.style)} · {item.config.ratio} · {item.config.duration}s
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="配置"
          >
            {expanded ? <ChevronUp size={14} /> : <Settings2 size={14} />}
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 pt-0 border-t border-slate-700/50">
          <div className="pt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">视频风格</label>
              <select
                value={item.config.style}
                onChange={e => onConfigChange({ style: e.target.value as VideoStyle })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {STYLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">画面比例</label>
              <select
                value={item.config.ratio}
                onChange={e => onConfigChange({ ratio: e.target.value as VideoRatio })}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {RATIO_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
