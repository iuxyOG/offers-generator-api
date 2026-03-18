import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { accounts } from './accounts'
import { campaignPrices } from './campaign-prices'
import { promotionItems } from './promotion-items'
import { automationLogs } from './automation-logs'

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    sku: text('sku').notNull(),
    nome: text('nome').notNull(),
    custo: decimal('custo', { precision: 12, scale: 2 }).notNull(),
    precoBase: decimal('preco_base', { precision: 12, scale: 2 }).notNull(),
    precoMinimo: decimal('preco_minimo', { precision: 12, scale: 2 }).notNull(),
    estoque: integer('estoque').notNull().default(0),
    emCampanhaAtiva: boolean('em_campanha_ativa').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('products_tenant_id_idx').on(table.tenantId),
    skuIdx: index('products_sku_idx').on(table.sku),
    emCampanhaAtivaIdx: index('products_em_campanha_ativa_idx').on(table.emCampanhaAtiva),
  }),
)

export const productsRelations = relations(products, ({ one, many }) => ({
  account: one(accounts, {
    fields: [products.accountId],
    references: [accounts.id],
  }),
  campaignPrices: many(campaignPrices),
  promotionItems: many(promotionItems),
  automationLogs: many(automationLogs),
}))
