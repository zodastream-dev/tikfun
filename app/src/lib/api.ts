import type { ProductItem } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// 防止同一 productId 被重复提交任务（React StrictMode / 重渲染导致的多次调用）
const activeJobs = new Set<string>()

/**
 * 调用 Edge Function 提交混元视频生成任务
 * 返回 jobId，供后续轮询使用
 */
export async function submitVideoJob(
  item: ProductItem,
  prompt: string
): Promise<{ jobId: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      productId: item.id,
      prompt,
      style: item.config.style,
      ratio: item.config.ratio,
      duration: item.config.duration,
    }),
  })

  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Failed to submit video job')
  return { jobId: data.jobId }
}

/**
 * 轮询 Edge Function 查询任务状态
 */
export async function pollVideoJob(
  jobId: string,
  productId: string
): Promise<{
  status: 'processing' | 'completed' | 'error'
  progress: number
  videoUrl?: string
  error?: string
}> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/poll-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ jobId, productId }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Poll failed')
  return data
}

/**
 * 启动真实视频生成流程：
 * 1. 提交任务 → 获取 jobId
 * 2. 每 8 秒轮询一次，直到完成或失败
 */
export function startRealVideoGeneration(
  item: ProductItem,
  prompt: string,
  onUpdate: (id: string, status: 'processing' | 'completed' | 'error', progress: number, videoUrl?: string, errorMsg?: string) => void
): void {
  // 防重：如果这个 productId 已经在处理中，直接忽略（防止 React StrictMode 双重调用）
  if (activeJobs.has(item.id)) {
    console.warn('[startRealVideoGeneration] 已有进行中的任务，跳过重复提交:', item.id)
    return
  }
  activeJobs.add(item.id)

  // 立即设为处理中
  onUpdate(item.id, 'processing', 5)

  submitVideoJob(item, prompt)
    .then(({ jobId }) => {
      onUpdate(item.id, 'processing', 15)

      let consecutiveErrors = 0
      const MAX_CONSECUTIVE_ERRORS = 5

      // 开始轮询，每 10 秒一次（混元视频生成需要几分钟，不必太频繁）
      const interval = setInterval(async () => {
        try {
          const result = await pollVideoJob(jobId, item.id)
          consecutiveErrors = 0  // 成功就重置错误计数

          if (result.status === 'completed') {
            clearInterval(interval)
            activeJobs.delete(item.id)
            onUpdate(item.id, 'completed', 100, result.videoUrl)
          } else if (result.status === 'error') {
            clearInterval(interval)
            activeJobs.delete(item.id)
            onUpdate(item.id, 'error', 0, undefined, result.error || '生成失败')
          } else {
            // 还在处理中，更新进度
            onUpdate(item.id, 'processing', result.progress || 30)
          }
        } catch (err) {
          consecutiveErrors++
          console.error(`Poll error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err)
          // 连续失败 5 次才认为真的出错
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            clearInterval(interval)
            activeJobs.delete(item.id)
            onUpdate(item.id, 'error', 0, undefined, '轮询失败，请重试')
          }
        }
      }, 10000)

      // 最长等待 30 分钟，超时认为失败
      setTimeout(() => {
        clearInterval(interval)
        activeJobs.delete(item.id)
        onUpdate(item.id, 'error', 0, undefined, '生成超时，请重试')
      }, 30 * 60 * 1000)
    })
    .catch((err) => {
      console.error('Submit job error:', err)
      activeJobs.delete(item.id)
      onUpdate(item.id, 'error', 0, undefined, err.message || '提交任务失败')
    })
}
