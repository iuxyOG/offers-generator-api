import { config } from 'dotenv'
import { resolve } from 'path'
import { createHmac } from 'crypto'

config({ path: resolve(__dirname, '..', '..', '..', '..', '.env') })

const partnerId = Number(process.env.SHOPEE_PARTNER_ID)
const partnerKey = process.env.SHOPEE_PARTNER_KEY!
const authUrl = process.env.SHOPEE_AUTH_URL || 'https://partner.test-stable.shopeemobile.com'
const baseUrl = process.env.SHOPEE_BASE_URL!
const redirect = process.env.SHOPEE_REDIRECT_URL!

const path = '/api/v2/shop/auth_partner'
const ts = Math.floor(Date.now() / 1000)
const baseString = `${partnerId}${path}${ts}`
const sign = createHmac('sha256', partnerKey).update(baseString).digest('hex')

// OAuth uses authUrl (partner.shopeemobile.com domain)
const fullUrl = `${authUrl}${path}?partner_id=${partnerId}&timestamp=${ts}&sign=${sign}&redirect=${encodeURIComponent(redirect)}`

console.log('=== Shopee Sign Test (URLs corrigidas) ===')
console.log()
console.log(`partner_id:  ${partnerId}`)
console.log(`partner_key: ${partnerKey.slice(0, 8)}...${partnerKey.slice(-4)} (len=${partnerKey.length})`)
console.log(`authUrl:     ${authUrl}  (OAuth redirect)`)
console.log(`baseUrl:     ${baseUrl}  (API calls)`)
console.log(`redirect:    ${redirect}`)
console.log(`timestamp:   ${ts}`)
console.log(`baseString:  "${baseString}"`)
console.log(`sign:        ${sign}`)
console.log()
console.log(`Full URL: ${fullUrl}`)
console.log()
console.log('Testing...')

fetch(fullUrl, { redirect: 'manual' })
  .then(async (res) => {
    if (res.status === 302) {
      console.log(`✓ ${res.status} SUCCESS`)
      console.log(`  Location: ${res.headers.get('location')?.slice(0, 120)}`)
    } else {
      const body = await res.text()
      console.log(`✗ ${res.status}`)
      console.log(`  Body: ${body.slice(0, 300)}`)
    }
  })
  .catch((e) => console.error('Error:', (e as Error).message))
