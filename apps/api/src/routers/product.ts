import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '@ofertas/db'
import { products, campaignPrices } from '@ofertas/db'
import { eq, and, sql, isNull, desc } from 'drizzle-orm'
import { runCatalogSync } from '../services/catalog-sync'

export const productRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid().optional(),
        search: z.string().optional(),
        hasActiveCampaign: z.boolean().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(products.tenantId, ctx.tenantId),
        isNull(products.deletedAt),
      ]

      if (input.accountId) {
        conditions.push(eq(products.accountId, input.accountId))
      }
      if (input.search) {
        conditions.push(
          sql`(${products.sku} ILIKE ${`%${input.search}%`} OR ${products.nome} ILIKE ${`%${input.search}%`})`,
        )
      }
      if (input.hasActiveCampaign !== undefined) {
        conditions.push(eq(products.emCampanhaAtiva, input.hasActiveCampaign))
      }
      if (input.cursor) {
        conditions.push(sql`${products.id} < ${input.cursor}`)
      }

      const items = await db
        .select()
        .from(products)
        .leftJoin(campaignPrices, eq(products.id, campaignPrices.productId))
        .where(and(...conditions))
        .orderBy(desc(products.createdAt))
        .limit(input.limit + 1)

      const hasMore = items.length > input.limit
      if (hasMore) items.pop()

      return {
        items: items.map((row) => ({
          ...row.products,
          campaignPrices: row.campaign_prices,
        })),
        nextCursor: hasMore ? items[items.length - 1]?.products.id : null,
      }
    }),

  updatePrice: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        field: z.enum(['shopeePromo', 'shopeeMin', 'mlPromo', 'mlMin']),
        value: z.string().regex(/^\d+(\.\d{1,2})?$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [product] = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, input.productId),
            eq(products.tenantId, ctx.tenantId),
          ),
        )
        .limit(1)

      if (!product) {
        throw new Error('Produto não encontrado')
      }

      if (parseFloat(input.value) < parseFloat(product.precoMinimo)) {
        throw new Error('Preço abaixo do mínimo permitido')
      }

      const existing = await db
        .select()
        .from(campaignPrices)
        .where(
          and(
            eq(campaignPrices.productId, input.productId),
            eq(campaignPrices.tenantId, ctx.tenantId),
          ),
        )
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(campaignPrices)
          .set({
            [input.field]: input.value,
            updatedAt: new Date(),
          })
          .where(eq(campaignPrices.id, existing[0].id))
      } else {
        await db.insert(campaignPrices).values({
          tenantId: ctx.tenantId,
          productId: input.productId,
          [input.field]: input.value,
        })
      }

      return { success: true }
    }),

  syncCatalog: protectedProcedure
    .input(z.object({ accountId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await runCatalogSync({
        tenantId: ctx.tenantId,
        accountId: input.accountId,
      })
      return result
    }),
})
