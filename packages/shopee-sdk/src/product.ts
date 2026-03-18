import type { ShopeeClient } from './client'
import type {
  GetItemListRequest,
  GetItemListResponse,
  GetItemBaseInfoResponse,
  ShopeeItem,
} from './types'

export class ShopeeProductAPI {
  constructor(private client: ShopeeClient) {}

  async getItemList(params: GetItemListRequest): Promise<GetItemListResponse> {
    return this.client.request<GetItemListResponse>({
      method: 'GET',
      path: '/api/v2/product/get_item_list',
      query: {
        offset: params.offset,
        page_size: params.page_size,
        ...(params.item_status ? { item_status: params.item_status } : {}),
      },
    })
  }

  async getAllItems(status?: 'NORMAL' | 'BANNED' | 'DELETED' | 'UNLIST'): Promise<ShopeeItem[]> {
    const allItems: ShopeeItem[] = []
    let offset = 0
    const pageSize = 100
    let hasNext = true

    while (hasNext) {
      const response = await this.getItemList({
        offset,
        page_size: pageSize,
        item_status: status,
      })

      if (response.error) {
        throw new Error(`Shopee getItemList error: ${response.error} - ${response.message}`)
      }

      allItems.push(...response.response.item)
      hasNext = response.response.has_next_page
      offset = response.response.next_offset
    }

    return allItems
  }

  async getItemBaseInfo(itemIds: number[]): Promise<GetItemBaseInfoResponse> {
    return this.client.request<GetItemBaseInfoResponse>({
      method: 'GET',
      path: '/api/v2/product/get_item_base_info',
      query: {
        item_id_list: itemIds.join(','),
      },
    })
  }
}
