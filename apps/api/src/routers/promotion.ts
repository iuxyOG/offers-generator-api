import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '@ofertas/db'
import { promotions, promotionItems, products } from '@ofertas/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const promotionRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        status: z.enum(['RASCUNHO', 'ATIVA', 'ENCERRADA', 'FALHOU']).optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(promotions.tenantId, ctx.tenantId)]

      if (input.accountId) {
        conditions.push(eq(promotions.accountId, input.accountId))
      }
      if (input.status) {
        conditions.push(eq(promotions.status, input.status))
      }
      if (input.cursor) {
        conditions.push(sql`${promotions.id} < ${input.cursor}`)
      }

      const items = await db
        .select()
        .from(promotions)
        .where(and(...conditions))
        .orderBy(desc(promotions.createdAt))
        .limit(input.limit + 1)

      const hasMore = items.length > input.limit
      if (hasMore) items.pop()

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : null,
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [promo] = await db
        .select()
        .from(promotions)
        .where(
          and(eq(promotions.id, input.id), eq(promotions.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!promo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Promoção não encontrada' })
      }

      const items = await db
        .select()
        .from(promotionItems)
        .where(eq(promotionItems.promotionId, promo.id))

      return { ...promo, items }
    }),

  create: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        tipo: z.enum(['DISCOUNT', 'FLASH_SALE', 'COMBO']),
        inicio: z.string().datetime(),
        fim: z.string().datetime(),
        items: z.array(
          z.object({
            productId: z.string().uuid(),
            precoPromo: z.string().regex(/^\d+(\.\d{1,2})?$/),
            precoMin: z.string().regex(/^\d+(\.\d{1,2})?$/),
          }),
        ).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate all products belong to this tenant and price >= min
      for (const item of input.items) {
        const [product] = await db
          .select()
          .from(products)
          .where(
            and(
              eq(products.id, item.productId),
              eq(products.tenantId, ctx.tenantId),
            ),
          )
          .limit(1)

        if (!product) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Produto ${item.productId} não encontrado`,
          })
        }

        if (parseFloat(item.precoPromo) < parseFloat(product.precoMinimo)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Preço promo de ${product.nome} (R$ ${item.precoPromo}) abaixo do mínimo (R$ ${product.precoMinimo})`,
          })
        }

        if (product.emCampanhaAtiva) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Produto ${product.nome} já está em campanha ativa`,
          })
        }
      }

      // Create promotion
      const [promo] = await db
        .insert(promotions)
        .values({
          tenantId: ctx.tenantId,
          accountId: input.accountId,
          tipo: input.tipo,
          status: 'RASCUNHO',
          inicio: new Date(input.inicio),
          fim: new Date(input.fim),
        })
        .returning()

      // Create promotion items
      const insertedItems = await db
        .insert(promotionItems)
        .values(
          input.items.map((item) => ({
            promotionId: promo.id,
            productId: item.productId,
            precoPromo: item.precoPromo,
            precoMin: item.precoMin,
          })),
        )
        .returning()

      return { ...promo, items: insertedItems }
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(['RASCUNHO', 'ATIVA', 'ENCERRADA', 'FALHOU']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [promo] = await db
        .select()
        .from(promotions)
        .where(
          and(eq(promotions.id, input.id), eq(promotions.tenantId, ctx.tenantId)),
        )
        .limit(1)

      if (!promo) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Promoção não encontrada' })
      }

      const [updated] = await db
        .update(promotions)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(promotions.id, input.id))
        .returning()

      // If ending promotion, release products
      if (input.status === 'ENCERRADA' || input.status === 'FALHOU') {
        const items = await db
          .select()
          .from(promotionItems)
          .where(eq(promotionItems.promotionId, promo.id))

        for (const item of items) {
          await db
            .update(products)
            .set({ emCampanhaAtiva: false, updatedAt: new Date() })
            .where(eq(products.id, item.productId))
        }
      }

      return updated
    }),
})
