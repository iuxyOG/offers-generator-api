import type { FastifyInstance } from 'fastify'
import { signJwt } from '../context'

// Dev-only simple auth — replace with proper auth in production
const DEV_USERS: Record<string, { password: string; tenantId: string; userId: string }> = {
  'admin@ofertas.dev': {
    password: 'admin123',
    tenantId: 'tenant_dev_001',
    userId: 'user_dev_001',
  },
}

export function authRoutes(server: FastifyInstance) {
  server.post('/auth/login', async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string }

    const user = DEV_USERS[email]
    if (!user || user.password !== password) {
      return reply.status(401).send({ error: 'Credenciais inválidas' })
    }

    const token = signJwt({
      userId: user.userId,
      tenantId: user.tenantId,
      email,
    })

    return { token, tenantId: user.tenantId, userId: user.userId, email }
  })

  server.get('/auth/me', async (req, reply) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Token não fornecido' })
    }

    const { verifyJwt } = await import('../context')
    const payload = verifyJwt(authHeader.slice(7))
    if (!payload) {
      return reply.status(401).send({ error: 'Token inválido' })
    }

    return payload
  })
}
