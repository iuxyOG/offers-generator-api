import { createHmac } from 'crypto'
import type { ShopeeConfig, ShopeeRequestParams } from './types'

const DEFAULT_BASE_URL = 'https://partner.shopeemobile.com'
// Sandbox: https://openplatform.sandbox.test-stable.shopee.sg
const TIMEOUT_MS = 30_000
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1_000

export class ShopeeClient {
  readonly partnerId: number
  readonly partnerKey: string
  readonly shopId: number
  private accessToken: string
  private readonly baseUrl: string
  private readonly limiter: ReturnType<typeof createRateLimiter>
  private readonly onTokenExpired?: () => Promise<{ accessToken: string } | null>
  private isRetrying = false

  constructor(config: ShopeeConfig) {
    this.partnerId = config.partnerId
    this.partnerKey = config.partnerKey
    this.shopId = config.shopId
    this.accessToken = config.accessToken
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    this.limiter = createRateLimiter(10)
    this.onTokenExpired = config.onTokenExpired
  }

  sign(path: string, timestamp: number): string {
    const baseString = `${this.partnerId}${path}${timestamp}${this.accessToken}${this.shopId}`
    return createHmac('sha256', this.partnerKey).update(baseString).digest('hex')
  }

  async request<T = unknown>(params: ShopeeRequestParams): Promise<T> {
    return this.limiter(async () => {
      const { method = 'GET', path, body, query } = params
      const timestamp = Math.floor(Date.now() / 1000)
      const sign = this.sign(path, timestamp)

      const url = new URL(`${this.baseUrl}${path}`)
      url.searchParams.set('partner_id', String(this.partnerId))
      url.searchParams.set('timestamp', String(timestamp))
      url.searchParams.set('access_token', this.accessToken)
      url.searchParams.set('shop_id', String(this.shopId))
      url.searchParams.set('sign', sign)

      if (query) {
        for (const [k, v] of Object.entries(query)) {
          url.searchParams.set(k, String(v))
        }
      }

      let lastError: Error | null = null
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

          const res = await fetch(url.toString(), {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          const data = (await res.json()) as T & { error?: string }

          if (res.status >= 500) {
            throw new Error(`Shopee API ${res.status}: ${JSON.stringify(data)}`)
          }

          // Auto-refresh expired token
          if (data.error === 'error_auth' && this.onTokenExpired && !this.isRetrying) {
            this.isRetrying = true
            try {
              const newToken = await this.onTokenExpired()
              if (newToken) {
                this.accessToken = newToken.accessToken
                return this.request<T>(params)
              }
            } finally {
              this.isRetrying = false
            }
          }

          return data
        } catch (err) {
          lastError = err as Error
          if (attempt < MAX_RETRIES - 1) {
            const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt)
            await sleep(backoff)
          }
        }
      }

      throw lastError!
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createRateLimiter(maxConcurrent: number) {
  let active = 0
  const queue: Array<() => void> = []

  function tryNext() {
    if (active < maxConcurrent && queue.length > 0) {
      active++
      const next = queue.shift()!
      next()
    }
  }

  return async function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          resolve(await fn())
        } catch (err) {
          reject(err)
        } finally {
          active--
          tryNext()
        }
      }
      queue.push(run)
      tryNext()
    })
  }
}
