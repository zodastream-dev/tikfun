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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { jobId: rawJobId, productId } = await req.json()
    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing productId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 优先用传入的 jobId，否则从数据库读取
    let jobId = rawJobId
    if (!jobId) {
      const { data } = await supabase
        .from('products')
        .select('job_id')
        .eq('id', productId)
        .single()
      jobId = data?.job_id
    }

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'No jobId found for this product' }), {
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
    // 腾讯云混元生视频实际返回的 Status 枚举值：WAIT / RUN / FAIL / DONE（全大写）
    const jobStatus = job?.Status

    console.log('Job status:', jobStatus, 'Full response:', JSON.stringify(job))

    // 状态映射（以官方文档为准：WAIT/RUN/FAIL/DONE）
    const progressMap: Record<string, number> = {
      WAIT: 20,
      RUN: 60,
      DONE: 100,
      FAIL: 0,
    }

    const progress = progressMap[jobStatus] ?? 30

    if (jobStatus === 'DONE') {
      // 官方文档：视频URL字段名为 ResultVideoUrl
      const videoUrl = job?.ResultVideoUrl || job?.ResultVideo || job?.VideoUrl || job?.Url
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

    if (jobStatus === 'FAIL') {
      const errMsg = job?.ErrorMessage || job?.ErrMsg || '视频生成失败'
      await supabase
        .from('products')
        .update({ video_status: 'error', error_msg: errMsg })
        .eq('id', productId)

      return new Response(JSON.stringify({
        status: 'error',
        error: errMsg,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // WAIT 或 RUN：还在处理中
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
