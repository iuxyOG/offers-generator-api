import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { promotionTypeEnum, promotionStatusEnum } from './enums'
import { accounts } from './accounts'
import { promotionItems } from './promotion-items'

export const promotions = pgTable(
  'promotions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: text('tenant_id').notNull(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    tipo: promotionTypeEnum('tipo').notNull(),
    status: promotionStatusEnum('status').notNull().default('RASCUNHO'),
    shopeePromotionId: text('shopee_promotion_id'),
    inicio: timestamp('inicio', { withTimezone: true }).notNull(),
    fim: timestamp('fim', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('promotions_tenant_id_idx').on(table.tenantId),
    statusIdx: index('promotions_status_idx').on(table.status),
    inicioIdx: index('promotions_inicio_idx').on(table.inicio),
    fimIdx: index('promotions_fim_idx').on(table.fim),
  }),
)

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [promotions.accountId],
    references: [accounts.id],
  }),
  items: many(promotionItems),
}))
