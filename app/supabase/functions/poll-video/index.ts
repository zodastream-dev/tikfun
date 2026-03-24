import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sign(secretKey: string, date: string, service: string, signingKey?: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const key = signingKey ?? encoder.encode('TC3' + secretKey)
  const buf = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', buf, encoder.encode(date))
  return new Uint8Array(sig)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { jobId, productId } = await req.json()
    if (!jobId || !productId) {
      return new Response(JSON.stringify({ error: 'Missing jobId or productId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 查询腾讯云任务状态
    const result = await callTencentAPI('DescribeHunyuanToVideoJob', { JobId: jobId })

    console.log('Poll result:', JSON.stringify(result))

    if (result.Response?.Error) {
      await supabase
        .from('products')
        .update({ video_status: 'error', error_msg: result.Response.Error.Message })
        .eq('id', productId)

      return new Response(JSON.stringify({
        status: 'error',
        error: result.Response.Error.Message
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const job = result.Response
    const jobStatus = job?.Status  // 'submitted' | 'running' | 'succeed' | 'failed'

    // 状态映射
    const progressMap: Record<string, number> = {
      submitted: 15,
      running: 60,
      succeed: 100,
      failed: 0,
    }

    const progress = progressMap[jobStatus] ?? 30

    if (jobStatus === 'succeed') {
      const videoUrl = job?.ResultVideo || job?.VideoUrl || job?.Url
      await supabase
        .from('products')
        .update({ video_status: 'completed', video_progress: 100, video_url: videoUrl })
        .eq('id', productId)

      return new Response(JSON.stringify({
        status: 'completed',
        progress: 100,
        videoUrl,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (jobStatus === 'failed') {
      const errMsg = job?.ErrMsg || '视频生成失败'
      await supabase
        .from('products')
        .update({ video_status: 'error', error_msg: errMsg })
        .eq('id', productId)

      return new Response(JSON.stringify({
        status: 'error',
        error: errMsg,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 还在处理中
    await supabase
      .from('products')
      .update({ video_progress: progress })
      .eq('id', productId)

    return new Response(JSON.stringify({
      status: 'processing',
      progress,
      jobStatus,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Poll function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
