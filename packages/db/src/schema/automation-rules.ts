import { pgTable, uuid, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { accounts } from './accounts'
import { automationLogs } from './automation-logs'

export const automationRules = pgTable(
  'automation_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    nome: text('nome').notNull(),
    condicoesJson: jsonb('condicoes_json').notNull(),
    acoesJson: jsonb('acoes_json').notNull(),
    ativo: boolean('ativo').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('automation_rules_tenant_id_idx').on(table.tenantId),
  }),
)

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  account: one(accounts, {
    fields: [automationRules.accountId],
    references: [accounts.id],
  }),
  logs: many(automationLogs),
}))
