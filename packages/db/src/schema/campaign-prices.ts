import { pgTable, uuid, text, timestamp, decimal, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { products } from './products'

export const campaignPrices = pgTable(
  'campaign_prices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    shopeePromo: decimal('shopee_promo', { precision: 12, scale: 2 }),
    shopeeMin: decimal('shopee_min', { precision: 12, scale: 2 }),
    mlPromo: decimal('ml_promo', { precision: 12, scale: 2 }),
    mlMin: decimal('ml_min', { precision: 12, scale: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('campaign_prices_tenant_id_idx').on(table.tenantId),
  }),
)

export const campaignPricesRelations = relations(campaignPrices, ({ one }) => ({
  product: one(products, {
    fields: [campaignPrices.productId],
    references: [products.id],
  }),
}))
