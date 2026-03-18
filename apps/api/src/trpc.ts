import { initTRPC, TRPCError } from '@trpc/server'
import type { Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.tenantId || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Token inválido ou organização não selecionada',
    })
  }
  return next({
    ctx: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    },
  })
})
