import { db, decrypt } from '@ofertas/db'
import { accounts, products } from '@ofertas/db'
import { eq, and } from 'drizzle-orm'
import { ShopeeClient, ShopeeProductAPI } from '@ofertas/shopee-sdk'

interface CatalogSyncParams {
  tenantId: string
  accountId: string
}

export async function runCatalogSync({ tenantId, accountId }: CatalogSyncParams) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
    .limit(1)

  if (!account || !account.shopeeToken) {
    throw new Error(`Account ${accountId} not found or missing token`)
  }

  const client = new ShopeeClient({
    partnerId: Number(process.env.SHOPEE_PARTNER_ID),
    partnerKey: process.env.SHOPEE_PARTNER_KEY!,
    shopId: Number(account.shopeeShopId),
    accessToken: decrypt(account.shopeeToken),
    baseUrl: process.env.SHOPEE_BASE_URL,
  })

  const productApi = new ShopeeProductAPI(client)
  const shopeeItems = await productApi.getAllItems('NORMAL')

  const batchSize = 50
  for (let i = 0; i < shopeeItems.length; i += batchSize) {
    const batch = shopeeItems.slice(i, i + batchSize)
    const itemIds = batch.map((item) => item.item_id)
    const baseInfo = await productApi.getItemBaseInfo(itemIds)

    if (baseInfo.error) {
      console.error(`Shopee getItemBaseInfo error: ${baseInfo.error}`)
      continue
    }

    for (const item of baseInfo.response.item_list) {
      const sku = item.item_sku || String(item.item_id)
      const price = item.price_info?.[0]?.original_price ?? 0
      const stock = item.stock_info_v2?.summary_info?.total_available_stock ?? 0

      const existing = await db
        .select()
        .from(products)
        .where(
          and(
            eq(products.sku, sku),
            eq(products.accountId, accountId),
            eq(products.tenantId, tenantId),
          ),
        )
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(products)
          .set({
            nome: item.item_name,
            precoBase: String(price),
            estoque: stock,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existing[0].id))
      } else {
        await db.insert(products).values({
          tenantId,
          accountId,
          sku,
          nome: item.item_name,
          custo: '0',
          precoBase: String(price),
          precoMinimo: String(price * 0.8),
          estoque: stock,
        })
      }
    }
  }

  return { synced: shopeeItems.length }
}
