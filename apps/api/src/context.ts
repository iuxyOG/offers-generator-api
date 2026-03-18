import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'shopee-saas-secret-dev'

export interface JwtPayload {
  userId: string
  tenantId: string
  email: string
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export async function createContext({ req }: CreateFastifyContextOptions) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { tenantId: null, userId: null }
  }

  const payload = verifyJwt(authHeader.slice(7))
  if (!payload) {
    return { tenantId: null, userId: null }
  }

  return { tenantId: payload.tenantId, userId: payload.userId }
}

export type Context = Awaited<ReturnType<typeof createContext>>
