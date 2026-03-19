import { config } from 'dotenv'
import { resolve } from 'path'
import { createHmac } from 'crypto'

config({ path: resolve(__dirname, '..', '..', '..', '..', '.env') })

const partnerId = Number(process.env.SHOPEE_PARTNER_ID)
const partnerKey = process.env.SHOPEE_PARTNER_KEY!
const baseUrl = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com'
const redirectUrl = process.env.SHOPEE_REDIRECT_URL || ''

const path = '/api/v2/shop/auth_partner'
const timestamp = Math.floor(Date.now() / 1000)

// Formula: sign = HMAC-SHA256(partner_key, str(partner_id) + path + str(timestamp))
const baseString = `${partnerId}${path}${timestamp}`
const sign = createHmac('sha256', partnerKey).update(baseString).digest('hex')

const fullUrl = `${baseUrl}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`

console.log('=== Shopee Sign Debug ===')
console.log()
console.log('Input values:')
console.log(`  partner_id:  ${partnerId} (type: ${typeof partnerId})`)
console.log(`  partner_key: ${partnerKey.slice(0, 8)}...${partnerKey.slice(-4)} (length: ${partnerKey.length})`)
console.log(`  partner_key (hex bytes): ${Buffer.from(partnerKey).toString('hex').slice(0, 40)}...`)
console.log(`  base_url:    ${baseUrl}`)
console.log(`  redirect:    ${redirectUrl}`)
console.log(`  path:        ${path}`)
console.log(`  timestamp:   ${timestamp}`)
console.log()
console.log('Sign computation:')
console.log(`  baseString = str(partner_id) + path + str(timestamp)`)
console.log(`  baseString = "${partnerId}" + "${path}" + "${timestamp}"`)
console.log(`  baseString = "${baseString}"`)
console.log(`  baseString (hex): ${Buffer.from(baseString).toString('hex')}`)
console.log(`  baseString length: ${baseString.length}`)
console.log()
console.log(`  sign = HMAC-SHA256(partner_key, baseString)`)
console.log(`  sign = ${sign}`)
console.log()
console.log('Full URL:')
console.log(`  ${fullUrl}`)
console.log()

// Test: fetch the URL to check response
console.log('Testing URL...')
fetch(fullUrl, { method: 'GET', redirect: 'manual' })
  .then(async (res) => {
    console.log(`  Status: ${res.status}`)
    console.log(`  Location: ${res.headers.get('location') ?? '(none)'}`)
    if (res.status !== 302) {
      const body = await res.text()
      console.log(`  Body: ${body.slice(0, 500)}`)
    } else {
      console.log('  => SUCCESS: Shopee returned redirect (302)')
    }
  })
  .catch((err) => {
    console.error(`  Error: ${err.message}`)
  })
