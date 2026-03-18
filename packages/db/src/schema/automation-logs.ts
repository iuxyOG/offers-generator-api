import { pgTable, uuid, text, timestamp, jsonb, decimal, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { automationResultEnum } from './enums'
import { accounts } from './accounts'
import { products } from './products'
import { automationRules } from './automation-rules'

export const automationLogs = pgTable(
  'automation_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    produtoId: uuid('produto_id')
      .references(() => products.id),
    regraId: uuid('regra_id')
      .references(() => automationRules.id),
    resultado: automationResultEnum('resultado').notNull(),
    apiResponse: jsonb('api_response'),
    precoCalculado: decimal('preco_calculado', { precision: 12, scale: 2 }),
    motivo: text('motivo'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('automation_logs_tenant_id_idx').on(table.tenantId),
  }),
)

export const automationLogsRelations = relations(automationLogs, ({ one }) => ({
  account: one(accounts, {
    fields: [automationLogs.accountId],
    references: [accounts.id],
  }),
  produto: one(products, {
    fields: [automationLogs.produtoId],
    references: [products.id],
  }),
  regra: one(automationRules, {
    fields: [automationLogs.regraId],
    references: [automationRules.id],
  }),
}))
