import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '@ofertas/db'
import { automationRules, automationLogs } from '@ofertas/db'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const automationRuleRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(automationRules.tenantId, ctx.tenantId)]

      if (input?.accountId) {
        conditions.push(eq(automationRules.accountId, input.accountId))
      }

      const rules = await db
        .select()
        .from(automationRules)
        .where(and(...conditions))
        .orderBy(desc(automationRules.createdAt))

      // For each rule, get last execution info
      const result = await Promise.all(
        rules.map(async (rule) => {
          const [lastLog] = await db
            .select()
            .from(automationLogs)
            .where(eq(automationLogs.regraId, rule.id))
            .orderBy(desc(automationLogs.createdAt))
            .limit(1)

          const estrategia = (rule.acoesJson as Record<string, unknown>)?.estrategia as string | undefined

          return {
            ...rule,
            estrategia: estrategia ?? 'MODERADA',
            lastRun: lastLog?.createdAt?.toISOString() ?? null,
            lastResult: lastLog?.resultado ?? null,
          }
        }),
      )

      return result
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [rule] = await db
        .select()
        .from(automationRules)
        .where(
          and(eq(automationRules.id, input.id), eq(automationRules.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!rule) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Regra não encontrada' })
      }

      return rule
    }),

  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        nome: z.string().min(1).max(255),
        estrategia: z.enum(['AGRESSIVA', 'MODERADA', 'CONSERVADORA']),
        descontoMax: z.number().min(1).max(50),
        margemMinima: z.number().min(0).max(50),
        estoqueMinimo: z.number().int().min(0).max(1000),
        condicoes: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [rule] = await db
        .insert(automationRules)
        .values({
          tenantId: ctx.tenantId,
          accountId: input.accountId,
          nome: input.nome,
          condicoesJson: input.condicoes ?? {},
          acoesJson: {
            estrategia: input.estrategia,
            descontoMax: input.descontoMax,
            margemMinima: input.margemMinima,
            estoqueMinimo: input.estoqueMinimo,
          },
        })
        .returning()

      return rule
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(255).optional(),
        estrategia: z.enum(['AGRESSIVA', 'MODERADA', 'CONSERVADORA']).optional(),
        descontoMax: z.number().min(1).max(50).optional(),
        margemMinima: z.number().min(0).max(50).optional(),
        estoqueMinimo: z.number().int().min(0).max(1000).optional(),
        condicoes: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(automationRules)
        .where(
          and(eq(automationRules.id, input.id), eq(automationRules.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Regra não encontrada' })
      }

      const currentAcoes = existing.acoesJson as Record<string, unknown>
      const updatedAcoes = {
        ...currentAcoes,
        ...(input.estrategia !== undefined ? { estrategia: input.estrategia } : {}),
        ...(input.descontoMax !== undefined ? { descontoMax: input.descontoMax } : {}),
        ...(input.margemMinima !== undefined ? { margemMinima: input.margemMinima } : {}),
        ...(input.estoqueMinimo !== undefined ? { estoqueMinimo: input.estoqueMinimo } : {}),
      }

      const [updated] = await db
        .update(automationRules)
        .set({
          ...(input.nome !== undefined ? { nome: input.nome } : {}),
          ...(input.condicoes !== undefined ? { condicoesJson: input.condicoes } : {}),
          acoesJson: updatedAcoes,
          updatedAt: new Date(),
        })
        .where(eq(automationRules.id, input.id))
        .returning()

      return updated
    }),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(automationRules)
        .where(
          and(eq(automationRules.id, input.id), eq(automationRules.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Regra não encontrada' })
      }

      const [updated] = await db
        .update(automationRules)
        .set({ ativo: !existing.ativo, updatedAt: new Date() })
        .where(eq(automationRules.id, input.id))
        .returning()

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(automationRules)
        .where(
          and(eq(automationRules.id, input.id), eq(automationRules.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Regra não encontrada' })
      }

      await db.delete(automationRules).where(eq(automationRules.id, input.id))
      return { success: true }
    }),
})
