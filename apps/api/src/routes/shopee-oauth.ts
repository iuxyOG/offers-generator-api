import { createHmac, randomUUID } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { ShopeeAuthAPI } from '@ofertas/shopee-sdk'
import { db } from '@ofertas/db'
import { accounts } from '@ofertas/db'
import { eq, and } from 'drizzle-orm'
import { verifyJwt } from '../context'

const oauthStates = new Map<string, { tenantId: string; expiresAt: number }>()

function getShopeeAuth() {
  const partnerId = Number(process.env.SHOPEE_PARTNER_ID)
  const partnerKey = process.env.SHOPEE_PARTNER_KEY!
  const baseUrl = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com'
  const authUrl = process.env.SHOPEE_AUTH_URL || 'https://partner.shopeemobile.com'

  if (!partnerId || !partnerKey) {
    throw new Error('SHOPEE_PARTNER_ID and SHOPEE_PARTNER_KEY must be set in .env')
  }

  return new ShopeeAuthAPI({ partnerId, partnerKey, baseUrl, authUrl })
}

function cleanExpiredStates() {
  const now = Date.now()
  for (const [key, val] of oauthStates) {
    if (val.expiresAt < now) oauthStates.delete(key)
  }
}

export function shopeeOAuthRoutes(server: FastifyInstance) {
  // Step 1: Get OAuth URL (requires auth via header or cookie)
  server.get('/auth/shopee/connect', async (req, reply) => {
    let token: string | undefined

    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }

    if (!token) {
      const cookieHeader = req.headers.cookie ?? ''
      const match = cookieHeader.match(/auth_token=([^;]+)/)
      if (match) token = match[1]
    }

    if (!token) {
      return reply.status(401).send({ error: 'Authentication required' })
    }

    const payload = verifyJwt(token)
    if (!payload) {
      return reply.status(401).send({ error: 'Token inválido' })
    }

    cleanExpiredStates()

    const state = randomUUID()
    oauthStates.set(state, {
      tenantId: payload.tenantId,
      expiresAt: Date.now() + 5 * 60 * 1000,
    })

    const shopeeAuth = getShopeeAuth()
    const redirectUrl = process.env.SHOPEE_REDIRECT_URL || 'http://localhost:3001/auth/shopee/callback'
    const authUrl = shopeeAuth.getAuthUrl(redirectUrl)

    // Append state to the redirect URL that Shopee will call back
    const urlWithState = `${authUrl}&state=${state}`

    console.log(`[shopee-oauth] Redirecting to Shopee (state=${state.slice(0, 8)}...)`)

    return reply.redirect(urlWithState)
  })

  // Step 2: Shopee redirects here after user authorizes
  server.get('/auth/shopee/callback', async (req, reply) => {
    const { code, shop_id, state } = req.query as Record<string, string>

    if (!code || !shop_id) {
      return reply.status(400).send({ error: 'Missing code or shop_id from Shopee callback' })
    }

    // Resolve tenantId from state or fallback to dev
    let tenantId = 'tenant_dev_001'
    if (state && oauthStates.has(state)) {
      const stateData = oauthStates.get(state)!
      oauthStates.delete(state)
      if (stateData.expiresAt > Date.now()) {
        tenantId = stateData.tenantId
      }
    }

    const shopId = Number(shop_id)
    console.log(`[shopee-oauth] Callback received: shop_id=${shopId}, tenant=${tenantId}, code=${code.slice(0, 10)}...`)

    const shopeeAuth = getShopeeAuth()
    const tokenRes = await shopeeAuth.getAccessToken(code, shopId)

    console.log(`[shopee-oauth] Token response:`, JSON.stringify({
      error: tokenRes.error,
      message: tokenRes.message,
      hasAccessToken: !!tokenRes.access_token,
      expireIn: tokenRes.expire_in,
    }))

    if (tokenRes.error) {
      console.error(`[shopee-oauth] Token exchange failed: ${tokenRes.error} - ${tokenRes.message}`)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      return reply.redirect(`${frontendUrl}/dashboard/contas?error=${encodeURIComponent(tokenRes.message || tokenRes.error)}`)
    }

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
          nome: `Loja Sandbox #${shopId}`,
          shopeeShopId: String(shopId),
          shopeeToken: tokenRes.access_token,
          shopeeRefreshToken: tokenRes.refresh_token,
          shopeeTokenExpiresAt: expiresAt,
          status: 'active',
        })
        .returning()
      console.log(`[shopee-oauth] Created account ${created.id}`)
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    return reply.redirect(`${frontendUrl}/dashboard/contas?connected=true`)
  })

  // Step 2b: Exchange code for token (called by Next.js API route — alternative)
  server.post('/auth/shopee/exchange-token', async (req, reply) => {
    const { code, shop_id, state } = req.body as { code: string; shop_id: string; state?: string }

    if (!code || !shop_id) {
      return reply.status(400).send({ error: 'code and shop_id are required' })
    }

    let tenantId = 'tenant_dev_001'
    if (state && oauthStates.has(state)) {
      const stateData = oauthStates.get(state)!
      oauthStates.delete(state)
      if (stateData.expiresAt > Date.now()) {
        tenantId = stateData.tenantId
      }
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

  // Debug: verify credentials and sign (dev only)
  server.get('/auth/shopee/debug', async (req, reply) => {
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: 'Not found' })
    }

    const partnerId = Number(process.env.SHOPEE_PARTNER_ID)
    const partnerKey = process.env.SHOPEE_PARTNER_KEY ?? ''
    const baseUrl = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com'
    const authUrl = process.env.SHOPEE_AUTH_URL || 'https://partner.shopeemobile.com'
    const redirectUrl = process.env.SHOPEE_REDIRECT_URL || ''
    const path = '/api/v2/shop/auth_partner'
    const timestamp = Math.floor(Date.now() / 1000)
    const baseString = `${partnerId}${path}${timestamp}`
    const sign = createHmac('sha256', partnerKey).update(baseString).digest('hex')

    const fullUrl = `${authUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`

    return {
      partnerId,
      partnerKeyPrefix: partnerKey.slice(0, 8) + '...',
      partnerKeyLength: partnerKey.length,
      authUrl,
      baseUrl,
      redirectUrl,
      timestamp,
      baseString,
      sign,
      fullUrl,
    }
  })
}
