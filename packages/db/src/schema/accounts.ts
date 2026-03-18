import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { accountStatusEnum } from './enums'
import { products } from './products'
import { promotions } from './promotions'
import { automationRules } from './automation-rules'
import { automationLogs } from './automation-logs'

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull(),
    nome: text('nome').notNull(),
    shopeeShopId: text('shopee_shop_id').notNull(),
    shopeeToken: text('shopee_token'),
    shopeeRefreshToken: text('shopee_refresh_token'),
    shopeeTokenExpiresAt: timestamp('shopee_token_expires_at', { withTimezone: true }),
    status: accountStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('accounts_tenant_id_idx').on(table.tenantId),
  }),
)

export const accountsRelations = relations(accounts, ({ many }) => ({
  products: many(products),
  promotions: many(promotions),
  automationRules: many(automationRules),
  automationLogs: many(automationLogs),
}))
