import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 腾讯云 API 签名（TC3-HMAC-SHA256）
async function sign(secretKey: string, date: string, service: string, signingKey?: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const key = signingKey ?? encoder.encode('TC3' + secretKey)
  const buf = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', buf, encoder.encode(date))
  return new Uint8Array(sig)
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function callTencentAPI(action: string, payload: Record<string, unknown>) {
  const secretId = Deno.env.get('TENCENT_SECRET_ID')!
  const secretKey = Deno.env.get('TENCENT_SECRET_KEY')!
  const service = 'vclm'
  const host = 'vclm.tencentcloudapi.com'
  const region = 'ap-guangzhou'
  const version = '2024-05-23'
  const algorithm = 'TC3-HMAC-SHA256'

  const now = Math.floor(Date.now() / 1000)
  const date = new Date(now * 1000).toISOString().slice(0, 10)

  const body = JSON.stringify(payload)
  const bodyHash = await sha256Hex(body)

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`
  const signedHeaders = 'content-type;host;x-tc-action'
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${bodyHash}`

  const credentialScope = `${date}/${service}/tc3_request`
  const stringToSign = `${algorithm}\n${now}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`

  const encoder = new TextEncoder()
  const signingDate = await sign(secretKey, date, service)
  const signingService = await sign(secretKey, service, '', signingDate)
  const signingRequest = await sign(secretKey, 'tc3_request', '', signingService)
  const signingFinal = await sign(secretKey, stringToSign, '', signingRequest)
  const signature = Array.from(signingFinal).map(b => b.toString(16).padStart(2, '0')).join('')

  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const response = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': host,
      'Authorization': authorization,
      'X-TC-Action': action,
      'X-TC-Region': region,
      'X-TC-Timestamp': String(now),
      'X-TC-Version': version,
    },
    body,
  })

  return response.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const { productId, prompt, style, ratio, duration } = await req.json()

    if (!productId || !prompt) {
      return new Response(JSON.stringify({ error: 'Missing productId or prompt' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 根据风格和比例构造增强 Prompt
    const stylePrompts: Record<string, string> = {
      modern: '科技感强，现代简约风格，蓝色调，专业商业广告风格，',
      elegant: '优雅精致，高端时尚风格，柔和暖色调，精品广告风格，',
      energetic: '活力动感，快节奏，鲜艳色彩，充满能量，',
      minimal: '简约清新，纯净背景，自然光线，生活化场景，',
      luxury: '奢华高端，金色质感，精致细节，顶级品牌广告风格，',
    }
    const stylePrefix = stylePrompts[style] || ''
    const fullPrompt = `${stylePrefix}高质量产品广告视频，${prompt}，专业摄影，4K画质，流畅动态，商业广告风格`

    // 根据比例设置分辨率（混元视频支持 720p / 1080p）
    const resolutionMap: Record<string, string> = {
      '16:9': '1080p',
      '9:16': '1080p',
      '1:1': '1080p',
    }
    const resolution = resolutionMap[ratio] || '1080p'

    // 调用混元视频 API
    const result = await callTencentAPI('SubmitHunyuanToVideoJob', {
      Prompt: fullPrompt,
      Resolution: resolution,
    })

    console.log('Tencent API response:', JSON.stringify(result))

    if (result.Response?.Error) {
      console.error('Tencent API error:', result.Response.Error)
      // 更新任务为失败状态
      await supabase
        .from('products')
        .update({ video_status: 'error', error_msg: result.Response.Error.Message })
        .eq('id', productId)

      return new Response(JSON.stringify({ error: result.Response.Error.Message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const jobId = result.Response?.JobId
    if (!jobId) {
      return new Response(JSON.stringify({ error: 'No JobId returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 将 jobId 存入数据库（存在 error_msg 字段临时使用，或新增字段）
    await supabase
      .from('products')
      .update({
        video_status: 'processing',
        video_progress: 10,
        error_msg: null,
        // 用 file_path 临时存储 jobId（如果你不想改 schema 的话）
        // 更好的方式是新增 job_id 列，但先这样
      })
      .eq('id', productId)

    // 将 jobId 存到单独的表或直接返回，让前端轮询
    return new Response(JSON.stringify({ success: true, jobId, productId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
