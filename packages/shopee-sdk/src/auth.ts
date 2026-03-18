import { createHmac } from 'crypto'
import type { RefreshTokenResponse } from './types'

const DEFAULT_BASE_URL = 'https://partner.shopeemobile.com'

export interface GetAccessTokenResponse {
  access_token: string
  refresh_token: string
  expire_in: number
  request_id: string
  error: string
  message: string
  shop_id_list: number[]
  merchant_id_list: number[]
}

export class ShopeeAuthAPI {
  readonly partnerId: number
  private readonly partnerKey: string
  readonly baseUrl: string

  constructor(config: { partnerId: number; partnerKey: string; baseUrl?: string }) {
    this.partnerId = config.partnerId
    this.partnerKey = config.partnerKey
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
  }

  /**
   * Generates HMAC-SHA256 signature for auth endpoints (no accessToken/shopId).
   */
  signAuth(path: string, timestamp: number): string {
    const baseString = `${this.partnerId}${path}${timestamp}`
    return createHmac('sha256', this.partnerKey).update(baseString).digest('hex')
  }

  /**
   * Generates the Shopee OAuth authorization URL.
   */
  getAuthUrl(redirectUrl: string): string {
    const path = '/api/v2/shop/auth_partner'
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = this.signAuth(path, timestamp)

    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set('partner_id', String(this.partnerId))
    url.searchParams.set('timestamp', String(timestamp))
    url.searchParams.set('sign', sign)
    url.searchParams.set('redirect', redirectUrl)

    return url.toString()
  }

  /**
   * Exchanges authorization code + shop_id for access_token.
   */
  async getAccessToken(code: string, shopId: number): Promise<GetAccessTokenResponse> {
    const path = '/api/v2/auth/token/get'
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = this.signAuth(path, timestamp)

    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set('partner_id', String(this.partnerId))
    url.searchParams.set('timestamp', String(timestamp))
    url.searchParams.set('sign', sign)

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        shop_id: shopId,
        partner_id: this.partnerId,
      }),
    })

    return (await res.json()) as GetAccessTokenResponse
  }

  /**
   * Refreshes an expired access_token.
   */
  async refreshToken(refreshToken: string, shopId: number): Promise<RefreshTokenResponse> {
    const path = '/api/v2/auth/access_token/get'
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = this.signAuth(path, timestamp)

    const url = new URL(`${this.baseUrl}${path}`)
    url.searchParams.set('partner_id', String(this.partnerId))
    url.searchParams.set('timestamp', String(timestamp))
    url.searchParams.set('sign', sign)

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        shop_id: shopId,
        partner_id: this.partnerId,
      }),
    })

    return (await res.json()) as RefreshTokenResponse
  }
}
