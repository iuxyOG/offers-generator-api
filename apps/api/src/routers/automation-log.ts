import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '@ofertas/db'
import { automationLogs } from '@ofertas/db'
import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm'

export const automationLogRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        resultado: z.enum(['SUCESSO', 'FALHOU', 'IGNORADO']).optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(automationLogs.tenantId, ctx.tenantId)]

      if (input.accountId) {
        conditions.push(eq(automationLogs.accountId, input.accountId))
      }
      if (input.resultado) {
        conditions.push(eq(automationLogs.resultado, input.resultado))
      }
      if (input.dateFrom) {
        conditions.push(gte(automationLogs.createdAt, new Date(input.dateFrom)))
      }
      if (input.dateTo) {
        conditions.push(lte(automationLogs.createdAt, new Date(input.dateTo + 'T23:59:59.999Z')))
      }
      if (input.cursor) {
        conditions.push(sql`${automationLogs.id} < ${input.cursor}`)
      }

      const items = await db
        .select()
        .from(automationLogs)
        .where(and(...conditions))
        .orderBy(desc(automationLogs.createdAt))
        .limit(input.limit + 1)

      const hasMore = items.length > input.limit
      if (hasMore) items.pop()

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      }
    }),

  metrics: protectedProcedure.query(async ({ ctx }) => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const [totals] = await db
      .select({ total: count() })
      .from(automationLogs)
      .where(
        and(
          eq(automationLogs.tenantId, ctx.tenantId),
          gte(automationLogs.createdAt, since24h),
        ),
      )

    const [successCount] = await db
      .select({ total: count() })
      .from(automationLogs)
      .where(
        and(
          eq(automationLogs.tenantId, ctx.tenantId),
          gte(automationLogs.createdAt, since24h),
          eq(automationLogs.resultado, 'SUCESSO'),
        ),
      )

    const totalAcoes = totals?.total ?? 0
    const totalSucesso = successCount?.total ?? 0
    const taxaSucesso = totalAcoes > 0 ? Math.round((totalSucesso / totalAcoes) * 100) : 0

    return {
      totalAcoes24h: totalAcoes,
      taxaSucesso,
      campanhasAuto24h: totalSucesso,
    }
  }),
})
