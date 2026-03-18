import { pgTable, uuid, decimal } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { promotions } from './promotions'
import { products } from './products'

export const promotionItems = pgTable('promotion_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  promotionId: uuid('promotion_id')
    .notNull()
    .references(() => promotions.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  precoPromo: decimal('preco_promo', { precision: 12, scale: 2 }).notNull(),
  precoMin: decimal('preco_min', { precision: 12, scale: 2 }).notNull(),
})

export const promotionItemsRelations = relations(promotionItems, ({ one }) => ({
  promotion: one(promotions, {
    fields: [promotionItems.promotionId],
    references: [promotions.id],
  }),
  product: one(products, {
    fields: [promotionItems.productId],
    references: [products.id],
  }),
}))
