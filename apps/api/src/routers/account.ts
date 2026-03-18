import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '@ofertas/db'
import { accounts } from '@ofertas/db'
import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const accountRouter = router({
  listActive: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.tenantId, ctx.tenantId),
          eq(accounts.status, 'active'),
        ),
      )
      .orderBy(desc(accounts.createdAt))
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, ctx.tenantId))
      .orderBy(desc(accounts.createdAt))
  }),

  disconnect: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, input.id), eq(accounts.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!account) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Conta não encontrada' })
      }

      await db
        .update(accounts)
        .set({
          status: 'inactive',
          shopeeToken: null,
          shopeeRefreshToken: null,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, input.id))

      return { success: true }
    }),
})
