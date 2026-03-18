import { pgEnum } from 'drizzle-orm/pg-core'

export const promotionTypeEnum = pgEnum('promotion_type', [
  'DISCOUNT',
  'FLASH_SALE',
  'COMBO',
])

export const promotionStatusEnum = pgEnum('promotion_status', [
  'RASCUNHO',
  'ATIVA',
  'ENCERRADA',
  'FALHOU',
])

export const automationResultEnum = pgEnum('automation_result', [
  'SUCESSO',
  'FALHOU',
  'IGNORADO',
])

export const accountStatusEnum = pgEnum('account_status', [
  'active',
  'inactive',
  'suspended',
])
