'use client'

import { type CreateTRPCReact, createTRPCReact } from '@trpc/react-query'
import { httpBatchLink } from '@trpc/client'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { getToken } from './auth'

type AppRouter = import('@ofertas/api/src/router').AppRouter

export const trpc: CreateTRPCReact<AppRouter, unknown, null> = createTRPCReact<AppRouter>()

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

export function createTRPCClientInstance() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/trpc',
        headers() {
          const token = getToken()
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
