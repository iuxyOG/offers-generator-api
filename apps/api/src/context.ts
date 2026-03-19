import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import jwt from 'jsonwebtoken'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return secret
}

const JWT_SECRET: string = getJwtSecret()

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

  if (!token) return { tenantId: null, userId: null }

  const payload = verifyJwt(token)
  if (!payload) return { tenantId: null, userId: null }

  return { tenantId: payload.tenantId, userId: payload.userId }
}

export type Context = Awaited<ReturnType<typeof createContext>>
