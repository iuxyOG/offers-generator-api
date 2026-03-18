import type { ShopeeClient } from './client'
import type {
  AddDiscountRequest,
  AddDiscountResponse,
  AddDiscountItemRequest,
  AddDiscountItemResponse,
  UpdateDiscountItemRequest,
  DeleteDiscountRequest,
  GetDiscountListRequest,
  GetDiscountListResponse,
} from './types'

export class ShopeeDiscountAPI {
  constructor(private client: ShopeeClient) {}

  async addDiscount(params: AddDiscountRequest): Promise<AddDiscountResponse> {
    return this.client.request<AddDiscountResponse>({
      method: 'POST',
      path: '/api/v2/discount/add_discount',
      body: params as unknown as Record<string, unknown>,
    })
  }

  async addDiscountItem(params: AddDiscountItemRequest): Promise<AddDiscountItemResponse> {
    return this.client.request<AddDiscountItemResponse>({
      method: 'POST',
      path: '/api/v2/discount/add_discount_item',
      body: params as unknown as Record<string, unknown>,
    })
  }

  async updateDiscountItem(params: UpdateDiscountItemRequest): Promise<AddDiscountItemResponse> {
    return this.client.request<AddDiscountItemResponse>({
      method: 'POST',
      path: '/api/v2/discount/update_discount_item',
      body: params as unknown as Record<string, unknown>,
    })
  }

  async deleteDiscount(params: DeleteDiscountRequest): Promise<{ error: string; message: string }> {
    return this.client.request({
      method: 'POST',
      path: '/api/v2/discount/delete_discount',
      body: params as unknown as Record<string, unknown>,
    })
  }

  async getDiscountList(params: GetDiscountListRequest): Promise<GetDiscountListResponse> {
    return this.client.request<GetDiscountListResponse>({
      method: 'GET',
      path: '/api/v2/discount/get_discount_list',
      query: params as unknown as Record<string, string | number>,
    })
  }
}
