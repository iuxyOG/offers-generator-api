import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from monorepo root
config({ path: resolve(__dirname, '..', '..', '..', '.env') })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { appRouter } from './router'
import { createContext } from './context'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import { authRoutes } from './routes/auth'
import { shopeeOAuthRoutes } from './routes/shopee-oauth'

const server = Fastify({ logger: true })

async function start() {
  await server.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })

  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: { router: appRouter, createContext },
  })

  authRoutes(server)
  shopeeOAuthRoutes(server)

  server.get('/health', async () => ({ status: 'ok' }))

  console.log(`[env] DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`)

  const port = Number(process.env.PORT) || 3001
  await server.listen({ port, host: '0.0.0.0' })
  console.log(`API running on :${port}`)
}

start().catch((err) => {
  server.log.error(err)
  process.exit(1)
})
