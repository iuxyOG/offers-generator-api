import { db } from '@ofertas/db'
import {
  accounts,
  products,
  automationRules,
  automationLogs,
  promotions,
  promotionItems,
} from '@ofertas/db'
import { eq, and, isNull } from 'drizzle-orm'
import { checkEligibility } from '@ofertas/rules'
import type { ProductForEligibility, EligibilityConfig } from '@ofertas/rules'

interface AutomationRunParams {
  tenantId: string
  accountId: string
  ruleId?: string
}

export async function runAutomation({ tenantId, accountId, ruleId }: AutomationRunParams) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
    .limit(1)

  if (!account) {
    throw new Error(`Account ${accountId} not found`)
  }

  const rulesCondition = ruleId
    ? and(eq(automationRules.id, ruleId), eq(automationRules.tenantId, tenantId))
    : and(
        eq(automationRules.accountId, accountId),
        eq(automationRules.tenantId, tenantId),
        eq(automationRules.ativo, true),
      )

  const rules = await db.select().from(automationRules).where(rulesCondition)

  if (rules.length === 0) {
    return { processed: 0, message: 'No active rules found' }
  }

  const allProducts = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.accountId, accountId),
        eq(products.tenantId, tenantId),
        isNull(products.deletedAt),
      ),
    )

  let processedCount = 0

  for (const rule of rules) {
    const ruleConfig = rule.acoesJson as Record<string, unknown>
    const config: EligibilityConfig = {
      estoqueMinimo: (ruleConfig.estoqueMinimo as number) ?? 5,
      margemMinima: (ruleConfig.margemMinima as number) ?? 10,
      taxaShopee: (ruleConfig.taxaShopee as number) ?? 12,
      estrategia: (ruleConfig.estrategia as EligibilityConfig['estrategia']) ?? 'MODERADA',
      descontoMax: ruleConfig.descontoMax as number | undefined,
    }

    const eligibleProducts: Array<{
      product: (typeof allProducts)[number]
      result: ReturnType<typeof checkEligibility>
    }> = []

    for (const product of allProducts) {
      const prodForCheck: ProductForEligibility = {
        id: product.id,
        custo: parseFloat(product.custo),
        precoBase: parseFloat(product.precoBase),
        precoMinimo: parseFloat(product.precoMinimo),
        estoque: product.estoque,
        emCampanhaAtiva: product.emCampanhaAtiva,
      }

      const result = checkEligibility(prodForCheck, config)

      if (result.eligible) {
        eligibleProducts.push({ product, result })
      } else {
        await db.insert(automationLogs).values({
          tenantId,
          accountId,
          produtoId: product.id,
          regraId: rule.id,
          resultado: 'IGNORADO',
          motivo: result.motivo ?? 'Não elegível',
          precoCalculado: result.precoRecomendado ? String(result.precoRecomendado) : null,
        })
      }
    }

    // Create local promotion (without Shopee API call in dev mode)
    if (eligibleProducts.length > 0) {
      const now = new Date()
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const [promotion] = await db
        .insert(promotions)
        .values({
          tenantId,
          accountId,
          tipo: 'DISCOUNT',
          status: 'ATIVA',
          shopeePromotionId: null,
          inicio: now,
          fim: end,
        })
        .returning()

      for (const { product, result } of eligibleProducts) {
        await db
          .update(products)
          .set({ emCampanhaAtiva: true, updatedAt: new Date() })
          .where(eq(products.id, product.id))

        await db.insert(promotionItems).values({
          promotionId: promotion.id,
          productId: product.id,
          precoPromo: String(result.precoRecomendado!),
          precoMin: product.precoMinimo,
        })

        await db.insert(automationLogs).values({
          tenantId,
          accountId,
          produtoId: product.id,
          regraId: rule.id,
          resultado: 'SUCESSO',
          precoCalculado: String(result.precoRecomendado!),
          motivo: `Campanha local criada — ${config.estrategia} (${result.margemEsperada?.toFixed(1)}% margem)`,
        })

        processedCount++
      }
    }
  }

  return { processed: processedCount }
}
