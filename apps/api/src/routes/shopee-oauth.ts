import { createHmac } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { ShopeeAuthAPI } from '@ofertas/shopee-sdk'
import { db } from '@ofertas/db'
import { accounts } from '@ofertas/db'
import { eq, and } from 'drizzle-orm'
import { verifyJwt } from '../context'

function getShopeeAuth() {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID)
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!
  const baseUrl = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com'

  if (!partnerId || !partnerKey) {
    throw new Error('SHOPEE_PARTNER_ID and SHOPEE_PARTNER_KEY must be set in .env')
  }

  return new ShopeeAuthAPI({ partnerId, partnerKey, baseUrl })
}

export function shopeeOAuthRoutes(server: FastifyInstance) {
  // Step 1: Redirect user to Shopee authorization page
  server.get('/auth/shopee/connect', async (req, reply) => {
    const token = (req.query as Record<string, string>).token
    if (!token) {
      return reply.status(401).send({ error: 'Token obrigatório (?token=SEU_JWT)' })
    }

    const payload = verifyJwt(token)
    if (!payload) {
      return reply.status(401).send({ error: 'Token inválido' })
    }

    const shopeeAuth = getShopeeAuth()
    const redirectUrl = process.env.SHOPEE_REDIRECT_URL || 'http://localhost:3000/api/auth/shopee/callback'
    const authUrl = shopeeAuth.getAuthUrl(redirectUrl)

    console.log(`[shopee-oauth] Redirecting to Shopee:`)
    console.log(`  partner_id: ${shopeeAuth.partnerId}`)
    console.log(`  base_url: ${shopeeAuth.baseUrl}`)
    console.log(`  redirect: ${redirectUrl}`)
    console.log(`  full_url: ${authUrl}`)

    return reply.redirect(authUrl)
  })

  // Step 2: Exchange code for token (called by Next.js API route)
  server.post('/auth/shopee/exchange-token', async (req, reply) => {
    const { code, shop_id } = req.body as { code: string; shop_id: string }

    if (!code || !shop_id) {
      return reply.status(400).send({ error: 'code and shop_id are required' })
    }

    const shopId = Number(shop_id)
    console.log(`[shopee-oauth] Exchange token: shop_id=${shopId}, code=${code.slice(0, 10)}...`)

    const shopeeAuth = getShopeeAuth()
    const tokenRes = await shopeeAuth.getAccessToken(code, shopId)

    console.log(`[shopee-oauth] Token response:`, JSON.stringify({
      error: tokenRes.error,
      message: tokenRes.message,
      hasAccessToken: !!tokenRes.access_token,
      expireIn: tokenRes.expire_in,
    }))

    if (tokenRes.error) {
      return reply.status(502).send({
        error: 'Shopee retornou erro ao trocar code por token',
        shopeeError: tokenRes.error,
        shopeeMessage: tokenRes.message,
      })
    }

    const tenantId = 'tenant_dev_001'
    const expiresAt = new Date(Date.now() + tokenRes.expire_in * 1000)

    const [existing] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.shopeeShopId, String(shopId)),
          eq(accounts.tenantId, tenantId),
        ),
      )
      .limit(1)

    if (existing) {
      await db
        .update(accounts)
        .set({
          shopeeToken: tokenRes.access_token,
          shopeeRefreshToken: tokenRes.refresh_token,
          shopeeTokenExpiresAt: expiresAt,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existing.id))
      console.log(`[shopee-oauth] Updated account ${existing.id}`)
    } else {
      const [created] = await db
        .insert(accounts)
        .values({
          tenantId,
          nome: `Loja Shopee #${shopId}`,
          shopeeShopId: String(shopId),
          shopeeToken: tokenRes.access_token,
          shopeeRefreshToken: tokenRes.refresh_token,
          shopeeTokenExpiresAt: expiresAt,
          status: 'active',
        })
        .returning()
      console.log(`[shopee-oauth] Created account ${created.id}`)
    }

    return { success: true, shopId, expiresAt: expiresAt.toISOString() }
  })

  // Debug: verify credentials and sign
  server.get('/auth/shopee/debug', async () => {
    const partnerId = Number(process.env.SHOPEE_PARTNER_ID)
    const partnerKey = process.env.SHOPEE_PARTNER_KEY ?? ''
    const baseUrl = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com'
    const redirectUrl = process.env.SHOPEE_REDIRECT_URL || ''
    const path = '/api/v2/shop/auth_partner'
    const timestamp = Math.floor(Date.now() / 1000)
    const baseString = `${partnerId}${path}${timestamp}`
    const sign = createHmac('sha256', partnerKey).update(baseString).digest('hex')

    const fullUrl = `${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`

    return {
      partnerId,
      partnerKeyPrefix: partnerKey.slice(0, 8) + '...',
      partnerKeyLength: partnerKey.length,
      baseUrl,
      redirectUrl,
      timestamp,
      baseString,
      sign,
      fullUrl,
      instructions: 'Abra fullUrl no browser. Se der 403 com "invalid_partner_id", o partner_id não está registrado na Shopee. Se der 403 com "wrong sign", a partner_key está errada.',
    }
  })
}
