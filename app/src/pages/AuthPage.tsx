import { useState } from 'react'
import { Video, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AuthPageProps {
  onAuth: () => void
}

export function AuthPage({ onAuth }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccessMsg('注册成功！请检查邮箱完成验证，然后登录。')
        setMode('login')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      setError(translateError(msg))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
            <Video size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VideoGen</h1>
          <p className="text-slate-400 text-sm mt-1">AI 产品视频生成平台</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">
            {mode === 'login' ? '登录账号' : '注册账号'}
          </h2>

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">邮箱</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1.5">密码</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
                  required
                  minLength={6}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all duration-200"
            >
              {loading && <Loader2 size={16} className="animate-spin-slow" />}
              {mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="text-sm text-slate-400 hover:text-indigo-300 transition-colors"
            >
              {mode === 'login' ? '没有账号？立即注册 →' : '已有账号？直接登录 →'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          数据由 Supabase 安全存储，仅你本人可访问
        </p>
      </div>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '邮箱或密码错误'
  if (msg.includes('Email not confirmed')) return '请先验证邮箱后再登录'
  if (msg.includes('User already registered')) return '该邮箱已注册，请直接登录'
  if (msg.includes('Password should be')) return '密码至少需要 6 位字符'
  if (msg.includes('rate limit')) return '操作过于频繁，请稍后再试'
  return msg
}
