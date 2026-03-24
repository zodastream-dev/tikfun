import { supabase } from './supabase'
import type { ProductItem } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

/**
 * 调用 Edge Function 提交混元视频生成任务
 * 返回 jobId，供后续轮询使用
 */
export async function submitVideoJob(
  item: ProductItem,
  prompt: string
): Promise<{ jobId: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
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
 * status: 'processing' | 'completed' | 'error'
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
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/poll-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
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
  // 立即设为处理中
  onUpdate(item.id, 'processing', 5)

  submitVideoJob(item, prompt)
    .then(({ jobId }) => {
      onUpdate(item.id, 'processing', 15)

      // 开始轮询，每 8 秒一次
      const interval = setInterval(async () => {
        try {
          const result = await pollVideoJob(jobId, item.id)

          if (result.status === 'completed') {
            clearInterval(interval)
            onUpdate(item.id, 'completed', 100, result.videoUrl)
          } else if (result.status === 'error') {
            clearInterval(interval)
            onUpdate(item.id, 'error', 0, undefined, result.error || '生成失败')
          } else {
            // 还在处理中，更新进度
            onUpdate(item.id, 'processing', result.progress || 30)
          }
        } catch (err) {
          console.error('Poll error:', err)
          // 轮询出错不立即失败，继续重试
        }
      }, 8000)

      // 最长等待 20 分钟，超时认为失败
      setTimeout(() => {
        clearInterval(interval)
        onUpdate(item.id, 'error', 0, undefined, '生成超时，请重试')
      }, 20 * 60 * 1000)
    })
    .catch((err) => {
      console.error('Submit job error:', err)
      onUpdate(item.id, 'error', 0, undefined, err.message || '提交任务失败')
    })
}
