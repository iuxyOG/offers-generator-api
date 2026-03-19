import { config } from 'dotenv'
import { resolve } from 'path'
import { spawn } from 'child_process'

// Load .env from monorepo root
config({ path: resolve(__dirname, '..', '..', '..', '..', '.env') })

async function main() {
  const port = Number(process.env.PORT) || 3001
  const subdomain = process.env.TUNNEL_SUBDOMAIN || 'ofertas-automacao'

  // Dynamic import for localtunnel (ESM/CJS compat)
  const localtunnel = (await import('localtunnel')).default

  console.log(`[tunnel] Opening tunnel to localhost:${port} (subdomain: ${subdomain})...`)

  const tunnel = await localtunnel({ port, subdomain })

  const publicUrl = tunnel.url
  const redirectUrl = `${publicUrl}/auth/shopee/callback`

  // Set env vars for the API process
  process.env.SHOPEE_REDIRECT_URL = redirectUrl

  console.log('')
  console.log('='.repeat(60))
  console.log(`  Tunnel URL:    ${publicUrl}`)
  console.log(`  Redirect URL:  ${redirectUrl}`)
  console.log('='.repeat(60))
  console.log('')
  console.log('  Atualize a Redirect URL no painel Shopee Open Platform:')
  console.log(`  ${redirectUrl}`)
  console.log('')

  tunnel.on('close', () => {
    console.log('[tunnel] Tunnel closed')
    process.exit(0)
  })

  tunnel.on('error', (err: Error) => {
    console.error('[tunnel] Tunnel error:', err.message)
  })

  // Start the API server as a child process, inheriting env (with SHOPEE_REDIRECT_URL)
  const child = spawn('tsx', ['src/server.ts'], {
    cwd: resolve(__dirname, '..', '..'),
    stdio: 'inherit',
    env: { ...process.env },
  })

  child.on('exit', (code) => {
    console.log(`[tunnel] API exited with code ${code}`)
    tunnel.close()
    process.exit(code ?? 1)
  })

  // Graceful shutdown
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`\n[tunnel] Received ${signal}, shutting down...`)
      child.kill(signal)
      tunnel.close()
    })
  }
}

main().catch((err) => {
  console.error('[tunnel] Fatal error:', err)
  process.exit(1)
})
