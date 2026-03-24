import { supabase } from './supabase'
import type { ProductItem } from '../types'
import type { DbProduct } from './supabase'

// ─── 转换函数 ─────────────────────────────────────────────────

export function dbToProduct(db: DbProduct): ProductItem {
  return {
    id: db.id,
    name: db.name,
    description: db.description ?? '',
    sourceType: db.source_type,
    fileName: db.file_name ?? undefined,
    fileSize: db.file_size ?? undefined,
    status: db.video_status,
    progress: db.video_progress,
    videoUrl: db.video_url ?? undefined,
    config: {
      style: db.video_style as ProductItem['config']['style'],
      ratio: db.video_ratio as ProductItem['config']['ratio'],
      duration: db.video_duration,
      bgMusic: db.bg_music,
      voiceover: db.voiceover,
      subtitles: db.subtitles,
    },
    createdAt: new Date(db.created_at),
    updatedAt: new Date(db.updated_at),
    errorMsg: db.error_msg ?? undefined,
  }
}

// ─── Products CRUD ────────────────────────────────────────────

export async function fetchProducts(): Promise<ProductItem[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as DbProduct[]).map(dbToProduct)
}

export async function insertProduct(item: ProductItem, userId: string): Promise<ProductItem> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: item.id,
      user_id: userId,
      name: item.name,
      description: item.description || null,
      source_type: item.sourceType,
      file_name: item.fileName || null,
      file_size: item.fileSize || null,
      video_status: item.status,
      video_progress: item.progress,
      video_style: item.config.style,
      video_ratio: item.config.ratio,
      video_duration: item.config.duration,
      bg_music: item.config.bgMusic,
      voiceover: item.config.voiceover,
      subtitles: item.config.subtitles,
    })
    .select()
    .single()

  if (error) throw error
  return dbToProduct(data as DbProduct)
}

export async function updateProductStatus(
  id: string,
  status: string,
  progress: number,
  videoUrl?: string,
  errorMsg?: string
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      video_status: status,
      video_progress: progress,
      ...(videoUrl ? { video_url: videoUrl } : {}),
      ...(errorMsg !== undefined ? { error_msg: errorMsg } : {}),
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Storage ──────────────────────────────────────────────────

export async function uploadDocument(
  file: File,
  userId: string,
  productId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${productId}.${ext}`

  const { error } = await supabase.storage
    .from('product-docs')
    .upload(path, file, { upsert: true })

  if (error) throw error
  return path
}
