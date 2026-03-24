import { useState, useCallback, useEffect } from 'react'
import { Video, Upload, ListTodo, Image, LogOut } from 'lucide-react'
import { UploadPage } from './pages/UploadPage'
import { TasksPage } from './pages/TasksPage'
import { GalleryPage } from './pages/GalleryPage'
import { AuthPage } from './pages/AuthPage'
import { VideoPreviewModal } from './components/VideoPreviewModal'
import type { ProductItem, TabId } from './types'
import { supabase } from './lib/supabase'
import { fetchProducts, insertProduct, updateProductStatus, deleteProduct } from './lib/db'
import { startRealVideoGeneration } from './lib/api'
import type { User } from '@supabase/supabase-js'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('upload')
  const [products, setProducts] = useState<ProductItem[]>([])
  const [previewItem, setPreviewItem] = useState<ProductItem | null>(null)

  // ─── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ─── Load products from DB ────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchProducts().then(setProducts).catch(console.error)
  }, [user])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setProducts([])
    setActiveTab('upload')
  }

  // ─── Add products ─────────────────────────────────────────────
  const handleAddProducts = useCallback(async (items: ProductItem[]) => {
    if (!user) return
    const saved: ProductItem[] = []
    for (const item of items) {
      try {
        const savedItem = await insertProduct(item, user.id)
        saved.push(savedItem)
      } catch {
        saved.push(item) // fallback local
      }
    }
    setProducts(prev => [...saved, ...prev])
  }, [user])

  // ─── 通用：启动生成（接入真实 API）────────────────────────────
  const startGenForItem = useCallback((item: ProductItem) => {
    // 用产品名称 + 描述作为 Prompt（文件上传的情况用文件名）
    const prompt = item.description
      ? item.description
      : `${item.name}，产品功能展示，电商广告视频`

    console.log('[startGenForItem] starting for item:', item.id, 'prompt:', prompt)

    startRealVideoGeneration(
      item,
      prompt,
      async (itemId, status, progress, videoUrl, errorMsg) => {
        console.log('[onUpdate]', itemId, status, progress)
        setProducts(prev => prev.map(p =>
          p.id === itemId
            ? { ...p, status, progress, ...(videoUrl ? { videoUrl } : {}), ...(errorMsg ? { errorMsg } : {}), updatedAt: new Date() }
            : p
        ))
        try {
          await updateProductStatus(itemId, status, progress, videoUrl, errorMsg)
        } catch { /* non-blocking */ }
      }
    )
  }, [])

  // ─── Start generation ─────────────────────────────────────────
  const handleStartGeneration = useCallback((ids: string[], itemsMap?: ProductItem[]) => {
    const sourceList = itemsMap ?? products
    console.log('[handleStartGeneration] ids:', ids, 'sourceList length:', sourceList.length)
    ids.forEach(id => {
      const item = sourceList.find(p => p.id === id)
      console.log('[handleStartGeneration] id:', id, 'item found:', !!item)
      if (!item) return
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'processing', progress: 0 } : p))
      startGenForItem(item)
    })
    setActiveTab('tasks')
  }, [products, startGenForItem])

  const handleRetry = useCallback((id: string) => {
    const item = products.find(p => p.id === id)
    if (!item) return
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'processing', progress: 0, errorMsg: undefined } : p))
    startGenForItem(item)
  }, [products, startGenForItem])

  const handleRemove = useCallback(async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id))
    try { await deleteProduct(id) } catch { /* */ }
  }, [])

  // ─── Render ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin-slow" />
      </div>
    )
  }

  if (!user) {
    return <AuthPage onAuth={() => {}} />
  }

  const processingCount = products.filter(p => p.status === 'processing').length
  const pendingCount = products.filter(p => p.status === 'pending').length
  const completedCount = products.filter(p => p.status === 'completed').length

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-900/80 border-r border-slate-800 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Video size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">VideoGen</div>
              <div className="text-xs text-slate-500">产品视频生成</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<Upload size={16} />} label="上传产品" active={activeTab === 'upload'} onClick={() => setActiveTab('upload')} />
          <NavItem icon={<ListTodo size={16} />} label="生成任务" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')}
            badge={processingCount + pendingCount > 0 ? processingCount + pendingCount : undefined} />
          <NavItem icon={<Image size={16} />} label="视频库" active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')}
            badge={completedCount > 0 ? completedCount : undefined} badgeColor="emerald" />
        </nav>

        {/* User + Stats */}
        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-xl p-3 space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">总任务</span>
              <span className="text-white font-medium">{products.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">生成中</span>
              <span className="text-amber-400 font-medium">{processingCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">已完成</span>
              <span className="text-emerald-400 font-medium">{completedCount}</span>
            </div>
          </div>

          {/* User info */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs text-slate-500 truncate max-w-[130px]" title={user.email}>
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              title="退出登录"
            >
              <LogOut size={14} />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2 px-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">AI 服务运行中</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'upload' && (
          <UploadPage onAddProducts={handleAddProducts} onStartGeneration={(ids, items) => handleStartGeneration(ids, items)} />
        )}
        {activeTab === 'tasks' && (
          <TasksPage items={products} onRetry={handleRetry} onRemove={handleRemove} onPreview={setPreviewItem} />
        )}
        {activeTab === 'gallery' && (
          <GalleryPage items={products} onPreview={setPreviewItem} onRemove={handleRemove} />
        )}
      </main>

      <VideoPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  )
}

function NavItem({ icon, label, active, onClick, badge, badgeColor = 'indigo' }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void
  badge?: number; badgeColor?: 'indigo' | 'emerald'
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
        active ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <span className={active ? 'text-indigo-400' : ''}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
          badgeColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
        }`}>{badge > 9 ? '9+' : badge}</span>
      )}
    </button>
  )
}
