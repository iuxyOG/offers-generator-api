import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const shopId = searchParams.get('shop_id')

  console.log(`[shopee-callback] Received: code=${code?.slice(0, 10)}..., shop_id=${shopId}`)

  if (!code || !shopId) {
    return NextResponse.json(
      {
        error: 'Parâmetros ausentes da Shopee',
        received: { code: !!code, shop_id: !!shopId },
        allParams: Object.fromEntries(searchParams.entries()),
      },
      { status: 400 },
    )
  }

  try {
    // Call Fastify API to exchange code for token and save to DB
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const res = await fetch(`${apiUrl}/auth/shopee/exchange-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, shop_id: shopId }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[shopee-callback] Exchange failed:', data)
      return NextResponse.json(
        { error: 'Falha ao trocar code por token', detail: data },
        { status: 502 },
      )
    }

    console.log('[shopee-callback] Token exchanged successfully, redirecting...')

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard/contas?connected=true', req.url))
  } catch (err) {
    console.error('[shopee-callback] Error:', err)
    return NextResponse.json(
      { error: 'Erro interno', detail: String(err) },
      { status: 500 },
    )
  }
}
